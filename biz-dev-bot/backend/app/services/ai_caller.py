"""Unified AI caller — uses DeepSeek by default, Gemini as fallback.

Automatically selects available LLM backend:
1. DeepSeek (if LLM_ENABLED + DEEPSEEK_API_KEY set)
2. Gemini (if GEMINI_API_KEY set)

Usage::

    result = await call_llm(prompt)
    result = await call_llm(prompt, temperature=0.3, max_tokens=4096)
"""

import json
import logging
import re
from typing import Optional

import httpx

from app.config import settings
from app.rate_limiter.retry import retry_with_backoff

logger = logging.getLogger(__name__)


async def call_llm(
    prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> dict:
    """Send a prompt to the available LLM and parse JSON response.

    Uses DeepSeek if configured, falls back to Gemini.
    Returns parsed JSON dict, or dict with 'raw_text' on parse failure.
    """
    if settings.LLM_ENABLED and settings.DEEPSEEK_API_KEY:
        return await _call_deepseek(prompt, temperature, max_tokens)
    elif settings.GEMINI_API_KEY:
        return await _call_gemini(prompt, temperature, max_tokens)
    else:
        raise RuntimeError(
            "No AI backend configured. Set LLM_ENABLED=true + DEEPSEEK_API_KEY "
            "or GEMINI_API_KEY in .env"
        )


async def _call_deepseek(
    prompt: str, temperature: float, max_tokens: int
) -> dict:
    """Call DeepSeek API and return parsed JSON."""
    async def _do_request() -> dict:
        async with httpx.AsyncClient(
            base_url=settings.DEEPSEEK_BASE_URL,
            timeout=90.0,
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
        ) as client:
            resp = await client.post("/v1/chat/completions", json={
                "model": settings.DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a JSON-only assistant. Always respond with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            })
            if resp.status_code == 401:
                raise ValueError("DeepSeek API key is invalid")
            if resp.status_code == 429:
                logger.warning("DeepSeek rate-limited (429)")
            resp.raise_for_status()
            return resp.json()

    data = await retry_with_backoff(
        _do_request, max_retries=3, base_delay=2.0, max_delay=30.0, service="deepseek"
    )

    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return _parse_json(text)


async def _call_gemini(
    prompt: str, temperature: float, max_tokens: int
) -> dict:
    """Call Gemini API and return parsed JSON."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
        f"?key={settings.GEMINI_API_KEY}"
    )

    async def _do_request() -> dict:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            })
            if resp.status_code == 403:
                raise PermissionError("Gemini API key invalid")
            if resp.status_code == 429:
                logger.warning("Gemini rate-limited (429)")
            resp.raise_for_status()
            return resp.json()

    data = await retry_with_backoff(
        _do_request, max_retries=3, base_delay=2.0, max_delay=30.0, service="gemini"
    )

    text = ""
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            text += part.get("text", "")

    return _parse_json(text)


def _parse_json(text: str) -> dict:
    """Parse JSON from LLM response, cleaning markdown fences."""
    text = text.strip()
    # Remove markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from LLM response: %s...", text[:200])
        return {"raw_text": text, "parse_error": True}


def get_llm_status() -> dict:
    """Return which LLM backend is configured."""
    if settings.LLM_ENABLED and settings.DEEPSEEK_API_KEY:
        return {
            "provider": "DeepSeek",
            "model": settings.DEEPSEEK_MODEL,
            "enabled": True,
        }
    elif settings.GEMINI_API_KEY:
        return {
            "provider": "Gemini",
            "model": settings.GEMINI_MODEL,
            "enabled": True,
        }
    return {"provider": "none", "model": "", "enabled": False}
