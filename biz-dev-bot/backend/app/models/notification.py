from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class Notification(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text)
    notification_type: Mapped[str] = mapped_column(String(50), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link_url: Mapped[Optional[str]] = mapped_column(String(1000))
    username: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
