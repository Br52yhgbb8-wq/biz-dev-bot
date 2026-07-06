"""Schemas for LLM conversation endpoints."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=32000)
    conversation_id: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    usage: dict = Field(default_factory=lambda: {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0})


class ConversationSummary(BaseModel):
    id: str
    user_id: str
    title: str
    message_count: int
    total_tokens: int
    model: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int


class EmailGenerationRequest(BaseModel):
    contact_name: str = ""
    company: str = ""
    product: str = ""
    goal: str = "cold_outreach"
    tone: str = "professional"
    additional_context: str = ""


class LinkedinGenerationRequest(BaseModel):
    name: str = ""
    company: str = ""
    goal: str = "cold_outreach"
    tone: str = "professional"
    additional_context: str = ""


class LLMStatusResponse(BaseModel):
    enabled: bool
    configured: bool
    api_key_valid: bool = False
    models: list[str] = []
    default_model: str = ""
    error: str = ""
