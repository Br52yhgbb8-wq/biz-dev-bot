import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class EmailTemplate(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "email_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    body_html: Mapped[Optional[str]] = mapped_column(Text)

    campaigns = relationship("Campaign", back_populates="email_template")


class EmailMessage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "email_messages"

    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True
    )
    thread_id: Mapped[Optional[str]] = mapped_column(String(255))
    gmail_message_id: Mapped[Optional[str]] = mapped_column(String(255))
    from_addr: Mapped[str] = mapped_column(String(500))
    to_addrs: Mapped[list] = mapped_column(JSONB, default=list)
    cc: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    bcc: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    subject: Mapped[Optional[str]] = mapped_column(String(500))
    body_text: Mapped[Optional[str]] = mapped_column(Text)
    body_html: Mapped[Optional[str]] = mapped_column(Text)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    direction: Mapped[str] = mapped_column(String(20))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    contact = relationship("Contact", back_populates="email_messages")
    campaign = relationship("Campaign", back_populates="email_messages")
