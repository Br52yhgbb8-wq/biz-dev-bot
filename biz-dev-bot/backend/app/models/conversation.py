"""Conversation and Message models for LLM chat history."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String(255), default="New Conversation")
    system_prompt = Column(Text, nullable=True)
    total_tokens = Column(Integer, default=0)
    model = Column(String(64), default="deepseek-chat")
    is_archived = Column(Integer, default=0)  # boolean as sqlite compat
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    messages = relationship(
        "Message",
        back_populates="conversation",
        order_by="Message.created_at",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_conv_user_updated", "user_id", "updated_at"),
    )

    @property
    def message_count(self) -> int:
        return len(self.messages) if self.messages else 0

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "title": self.title,
            "system_prompt": self.system_prompt,
            "total_tokens": self.total_tokens,
            "model": self.model,
            "message_count": self.message_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)   # user / assistant / system
    content = Column(Text, nullable=False)
    tokens = Column(Integer, default=0)           # token cost for this message
    metadata_ = Column("metadata", Text, nullable=True)  # extra info (json)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("ix_msg_conv_created", "conversation_id", "created_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "role": self.role,
            "content": self.content,
            "tokens": self.tokens,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
