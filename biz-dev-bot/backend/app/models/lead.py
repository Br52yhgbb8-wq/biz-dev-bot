"""Lead tracking model for AI-powered lead generation."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class Lead(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "leads"

    # ── Core fields ──────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500))
    website: Mapped[Optional[str]] = mapped_column(String(500))

    # ── Lead status & scoring ────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(50), default="discovered", index=True
    )
    # discovered | contacted | qualified | converted | dismissed
    score: Mapped[Optional[float]] = mapped_column(Float, default=0.0)

    # ── Source tracking ──────────────────────────────────────────
    source: Mapped[str] = mapped_column(
        String(100), default="manual", index=True
    )
    # manual | linkedin_search | web_search | referral | import
    source_url: Mapped[Optional[str]] = mapped_column(String(1000))

    # ── AI enrichment ────────────────────────────────────────────
    summary: Mapped[Optional[str]] = mapped_column(Text)          # AI-generated lead summary
    enrichment_data: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict
    )  # company info, social links, technologies, etc.
    intent_signals: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict
    )
    # buying intent signals: hiring_spree, funding, product_launch, etc.

    # ── Smart outreach ───────────────────────────────────────────
    outreach_template: Mapped[Optional[str]] = mapped_column(Text)   # AI-generated draft
    outreach_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    # ── Pipeline link (nullable — promoted to Contact on conversion) ──
    linked_contact_id: Mapped[Optional[str]] = mapped_column(String(50))

    # ── Tags & notes ─────────────────────────────────────────────
    tags: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # ── Background-job tracking ──────────────────────────────────
    last_discovered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    discovery_attempts: Mapped[int] = mapped_column(Integer, default=0)

    @property
    def score_label(self) -> str:
        if self.score is None:
            return "未评分"
        if self.score >= 80:
            return "🔥 热门"
        if self.score >= 60:
            return "✅ 高价值"
        if self.score >= 40:
            return "📌 中等"
        return "🔍 探索中"
