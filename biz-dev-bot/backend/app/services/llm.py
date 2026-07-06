"""DeepSeek LLM service with rate-limit safety, conversation persistence,
and token-budget management.

Usage::

    service = LLMService(db)
    reply = await service.chat(user_id="alice", message="Hello!")
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.conversation import Conversation, Message
from app.rate_limiter.retry import retry_with_backoff

logger = logging.getLogger(__name__)


class LLMService:
    """DeepSeek chat service with rate-limit gating, token budgeting,
    and persistent conversation history."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._http_client: Optional[httpx.AsyncClient] = None

    @property
    def enabled(self) -> bool:
        return bool(settings.LLM_ENABLED and settings.DEEPSEEK_API_KEY)

    @property
    def _client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                base_url=settings.DEEPSEEK_BASE_URL,
                timeout=60.0,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
        return self._http_client

    async def close(self):
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    # ── Conversation CRUD ────────────────────────────────────────────

    async def create_conversation(self, user_id: str, title: str = "",
                                  system_prompt: Optional[str] = None,
                                  model: str = "") -> Conversation:
        conv = Conversation(
            user_id=user_id,
            title=title or "New Conversation",
            system_prompt=system_prompt,
            model=model or settings.DEEPSEEK_MODEL,
        )
        self.db.add(conv)
        await self.db.commit()
        await self.db.refresh(conv)
        return conv

    async def get_conversation(self, conversation_id: uuid.UUID) -> Optional[Conversation]:
        result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def list_conversations(self, user_id: str, limit: int = 20,
                                 offset: int = 0) -> tuple[list[Conversation], int]:
        total = (await self.db.execute(
            select(func.count(Conversation.id)).where(
                Conversation.user_id == user_id,
                Conversation.is_archived == 0,
            )
        )).scalar() or 0
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.is_archived == 0)
            .order_by(Conversation.updated_at.desc())
            .offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        conv = await self.get_conversation(conversation_id)
        if not conv:
            return False
        await self.db.delete(conv)
        await self.db.commit()
        return True

    async def _load_history(self, conversation_id: uuid.UUID,
                            max_messages: int = 0) -> list[dict]:
        """Load message history formatted for the API request."""
        if max_messages <= 0:
            max_messages = settings.LLM_MAX_CONVERSATION_HISTORY
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(max_messages)
        )
        msgs = list(reversed(result.scalars().all()))
        history = []
        for m in msgs[-max_messages:]:
            history.append({"role": m.role, "content": m.content})
        return history

    async def _save_message(self, conversation_id: uuid.UUID, role: str,
                            content: str, tokens: int = 0) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tokens=tokens,
        )
        self.db.add(msg)
        await self.db.flush()
        # Update conversation total_tokens
        conv = await self.get_conversation(conversation_id)
        if conv:
            conv.total_tokens = (conv.total_tokens or 0) + tokens
            conv.title = self._auto_title(conv.title, role, content)
            await self.db.flush()
        return msg

    def _auto_title(self, current_title: str, role: str, content: str) -> str:
        """Auto-name conversation from first user message."""
        if current_title == "New Conversation" and role == "user":
            max_len = 50
            trimmed = content.strip()[:max_len]
            if len(content) > max_len:
                trimmed += "..."
            return trimmed
        return current_title

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (Chinese: ~1.5 chars/token, English: ~4 chars/token).

        Without tiktoken we use a conservative heuristic.
        """
        if not text:
            return 0
        # Count non-ASCII characters (Chinese, etc.)
        non_ascii = sum(1 for c in text if ord(c) > 127)
        ascii_chars = len(text) - non_ascii
        return int(non_ascii / 1.5 + ascii_chars / 4) + 10  # +10 buffer

    def _build_messages(self, system_prompt: Optional[str],
                        history: list[dict],
                        user_message: str) -> list[dict]:
        """Build the messages list for the API call, respecting context window."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        # Estimate total tokens and trim history if needed
        total_est = sum(self._estimate_tokens(m.get("content", "")) for m in messages)
        max_ctx = settings.LLM_CONTEXT_WINDOW - settings.LLM_MAX_TOKENS  # leave room for response

        while total_est > max_ctx and len(messages) > 2:
            # Remove oldest non-system message
            removed = messages.pop(1) if messages[0]["role"] == "system" else messages.pop(0)
            total_est -= self._estimate_tokens(removed.get("content", ""))
            logger.info("Trimmed old message from context (est=%d > %d)", total_est, max_ctx)

        return messages

    # ── Core API call ────────────────────────────────────────────────

    async def _call_deepseek(self, messages: list[dict],
                             temperature: float = 0.0) -> dict:
        """Make the actual HTTP call to DeepSeek, retry on 429/5xx."""
        async def _do_request() -> dict:
            resp = await self._client.post("/v1/chat/completions", json={
                "model": settings.DEEPSEEK_MODEL,
                "messages": messages,
                "temperature": temperature or settings.LLM_DEFAULT_TEMPERATURE,
                "max_tokens": settings.LLM_MAX_TOKENS,
            })
            if resp.status_code == 401:
                raise ValueError("DeepSeek API key is invalid or not set")
            if resp.status_code == 429:
                retry_after = resp.headers.get("retry-after", "10")
                logger.warning("DeepSeek rate-limited (429), retry-after=%s", retry_after)
            resp.raise_for_status()
            return resp.json()

        return await retry_with_backoff(
            _do_request,
            max_retries=5,
            base_delay=2.0,
            max_delay=60.0,
            service="llm_api",
        )

    # ── Public chat methods ──────────────────────────────────────────

    async def chat(self, user_id: str, message: str,
                   conversation_id: Optional[str] = None,
                   system_prompt: Optional[str] = None,
                   temperature: float = 0.0) -> dict:
        """Send a message and get a reply.

        If conversation_id is None, creates a new conversation.
        Returns::

            {
                "conversation_id": "uuid",
                "reply": "assistant text",
                "usage": {"prompt_tokens": N, "completion_tokens": N, "total_tokens": N},
            }
        """
        if not self.enabled:
            return {
                "conversation_id": "",
                "reply": "LLM is not enabled. Set LLM_ENABLED=true and "
                         "DEEPSEEK_API_KEY in your .env file.",
                "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            }

        # 1. Get or create conversation
        conv_id = uuid.UUID(conversation_id) if conversation_id else None
        conv: Optional[Conversation] = None
        if conv_id:
            conv = await self.get_conversation(conv_id)
        if not conv:
            conv = await self.create_conversation(
                user_id=user_id,
                system_prompt=system_prompt or settings.DEEPSEEK_MODEL,
            )

        # 2. Load history and build messages
        history = await self._load_history(conv.id)
        messages = self._build_messages(
            system_prompt or conv.system_prompt,
            history,
            message,
        )

        # 3. Call API
        try:
            data = await self._call_deepseek(messages, temperature)
        except Exception as exc:
            logger.error("DeepSeek call failed: %s", exc)
            return {
                "conversation_id": str(conv.id),
                "reply": f"AI 服务暂时不可用: {exc}",
                "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            }

        choice = data.get("choices", [{}])[0]
        reply = choice.get("message", {}).get("content", "")
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", 0)

        # 4. Persist both messages
        user_msg_tokens = self._estimate_tokens(message)
        await self._save_message(conv.id, "user", message, user_msg_tokens)
        await self._save_message(conv.id, "assistant", reply, completion_tokens or total_tokens)
        await self.db.commit()

        return {
            "conversation_id": str(conv.id),
            "reply": reply,
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
            },
        }

    # ── Content generation helpers ───────────────────────────────────

    async def generate_email_draft(self, user_id: str, context: dict) -> dict:
        """Generate an email draft from CRM context.

        context::
            {
                "contact_name": "...",
                "company": "...",
                "product": "...",
                "goal": "proposal_followup | cold_outreach | meeting_summary",
                "tone": "professional | warm | formal",
                "additional_context": "..."
            }
        """
        system_prompt = (
            "You are a business development assistant.  Generate professional "
            "email drafts in the user's CRM.  Output only the email body and "
            "subject line, no extra commentary."
        )
        prompt = self._build_generation_prompt("email", context)
        result = await self.chat(
            user_id, prompt,
            system_prompt=system_prompt,
            temperature=0.3,
        )
        return result

    async def generate_linkedin_message(self, user_id: str, context: dict) -> dict:
        """Generate a LinkedIn message from CRM context."""
        system_prompt = (
            "You are a business development assistant.  Generate concise, "
            "professional LinkedIn messages.  Keep it under 300 characters.  "
            "Output only the message body."
        )
        prompt = self._build_generation_prompt("linkedin", context)
        result = await self.chat(
            user_id, prompt,
            system_prompt=system_prompt,
            temperature=0.3,
        )
        return result

    def _build_generation_prompt(self, channel: str, context: dict) -> str:
        """Build a prompt for content generation."""
        name = context.get("contact_name", "") or context.get("name", "")
        company = context.get("company", "")
        product = context.get("product", "")
        goal = context.get("goal", "cold_outreach")
        tone = context.get("tone", "professional")
        extra = context.get("additional_context", "")

        goal_labels = {
            "cold_outreach": "Cold outreach — first contact",
            "follow_up": "Follow-up after previous contact",
            "proposal_followup": "Follow-up after proposal delivery",
            "meeting_summary": "Summary after a meeting",
            "thank_you": "Thank-you note",
        }
        goal_str = goal_labels.get(goal, goal)

        prompt_parts = [
            f"Channel: {channel}",
            f"Goal: {goal_str}",
            f"Tone: {tone}",
        ]
        if name:
            prompt_parts.append(f"Contact: {name}")
        if company:
            prompt_parts.append(f"Company: {company}")
        if product:
            prompt_parts.append(f"Product/Service: {product}")
        if extra:
            prompt_parts.append(f"Context: {extra}")

        prompt_parts.append(
            "\nWrite a professional LinkedIn message / email draft based on the above."
        )
        return "\n".join(prompt_parts)

    async def get_status(self) -> dict:
        """Check LLM service connectivity (API key valid?)."""
        if not self.enabled:
            return {"enabled": False, "configured": bool(settings.DEEPSEEK_API_KEY)}

        try:
            async with httpx.AsyncClient(
                base_url=settings.DEEPSEEK_BASE_URL, timeout=10.0,
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
            ) as client:
                resp = await client.get("/v1/models")
                if resp.status_code == 401:
                    return {"enabled": True, "configured": True, "api_key_valid": False}
                resp.raise_for_status()
                models = resp.json()
                model_list = [m["id"] for m in models.get("data", [])]
                return {
                    "enabled": True,
                    "configured": True,
                    "api_key_valid": True,
                    "models": model_list,
                    "default_model": settings.DEEPSEEK_MODEL,
                }
        except Exception as exc:
            return {"enabled": True, "configured": True, "api_key_valid": False, "error": str(exc)}
