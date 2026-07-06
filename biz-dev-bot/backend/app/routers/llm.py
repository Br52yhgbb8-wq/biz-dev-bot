"""LLM chat, content generation, and conversation management API."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.conversation import (
    ChatRequest,
    ChatResponse,
    ConversationListResponse,
    ConversationSummary,
    EmailGenerationRequest,
    LinkedinGenerationRequest,
    LLMStatusResponse,
)
from app.services.llm import LLMService

router = APIRouter(prefix="/api/llm", tags=["llm"])


async def _get_llm(db: AsyncSession = Depends(get_db)) -> LLMService:
    return LLMService(db)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Chat with DeepSeek AI.  Creates or continues a conversation."""
    service = LLMService(db)
    result = await service.chat(
        user_id=current_user,
        message=req.message,
        conversation_id=req.conversation_id,
        system_prompt=req.system_prompt,
        temperature=req.temperature,
    )
    return ChatResponse(**result)


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's conversation history."""
    service = LLMService(db)
    convs, total = await service.list_conversations(
        user_id=current_user, limit=limit, offset=offset
    )
    items = [
        ConversationSummary(
            id=str(c.id),
            user_id=c.user_id,
            title=c.title,
            message_count=c.message_count,
            total_tokens=c.total_tokens or 0,
            model=c.model,
            created_at=c.created_at.isoformat() if c.created_at else None,
            updated_at=c.updated_at.isoformat() if c.updated_at else None,
        )
        for c in convs
    ]
    return ConversationListResponse(conversations=items, total=total)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    service = LLMService(db)
    try:
        cid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = await service.get_conversation(cid)
    if not conv or conv.user_id != current_user:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await service.delete_conversation(cid)


@router.post("/generate/email", response_model=ChatResponse)
async def generate_email(
    req: EmailGenerationRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an email draft from context."""
    service = LLMService(db)
    result = await service.generate_email_draft(
        user_id=current_user,
        context=req.model_dump(),
    )
    return ChatResponse(**result)


@router.post("/generate/linkedin", response_model=ChatResponse)
async def generate_linkedin_message(
    req: LinkedinGenerationRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a LinkedIn message from context."""
    service = LLMService(db)
    result = await service.generate_linkedin_message(
        user_id=current_user,
        context=req.model_dump(),
    )
    return ChatResponse(**result)


@router.get("/status", response_model=LLMStatusResponse)
async def llm_status(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check LLM service connectivity."""
    service = LLMService(db)
    return await service.get_status()
