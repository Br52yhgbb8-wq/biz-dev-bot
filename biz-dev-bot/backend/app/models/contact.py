import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class Contact(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "contacts"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500))
    linkedin_profile: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    source: Mapped[str] = mapped_column(String(50), default="manual")
    tags: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    pipelines = relationship("Pipeline", back_populates="contact", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="contact", cascade="all, delete-orphan")
    email_messages = relationship("EmailMessage", back_populates="contact", cascade="all, delete-orphan")
