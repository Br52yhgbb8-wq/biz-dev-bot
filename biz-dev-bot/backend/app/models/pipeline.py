import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class Pipeline(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "pipelines"

    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    stage: Mapped[str] = mapped_column(String(50), default="discovery")
    deal_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    probability: Mapped[Optional[int]]
    expected_close_date: Mapped[Optional[date]] = mapped_column(Date)
    owner_id: Mapped[Optional[str]] = mapped_column(String(255))

    contact = relationship("Contact", back_populates="pipelines")
    activities = relationship("Activity", back_populates="pipeline", cascade="all, delete-orphan")
