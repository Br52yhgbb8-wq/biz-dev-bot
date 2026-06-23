from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class ScheduledTask(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "scheduled_tasks"

    type: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    result: Mapped[Optional[dict]] = mapped_column(JSONB)
