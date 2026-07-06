"""Pydantic schemas for Lead CRUD and Lead Gen API."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Lead CRUD ────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    source: str = "manual"
    tags: list[str] = []
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None
    summary: Optional[str] = None
    outreach_template: Optional[str] = None


class LeadResponse(BaseModel):
    id: uuid.UUID
    name: str
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    status: str
    score: Optional[float] = 0.0
    source: str
    source_url: Optional[str] = None
    summary: Optional[str] = None
    enrichment_data: dict = {}
    intent_signals: dict = {}
    outreach_template: Optional[str] = None
    linked_contact_id: Optional[str] = None
    tags: list[str] = []
    notes: Optional[str] = None
    last_discovered_at: Optional[datetime] = None
    discovery_attempts: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    items: list[LeadResponse]
    total: int


# ── Lead Generation API ─────────────────────────────────────────────

class LeadDiscoveryRequest(BaseModel):
    """Request Gemini to discover new leads based on a description."""
    industry: str = Field(..., max_length=200,
                          description="Target industry, e.g. 'SaaS', '电商', '人工智能'")
    region: Optional[str] = Field(None, max_length=100,
                                  description="Target region, e.g. '中国', '华东地区'")
    criteria: Optional[str] = Field(None, max_length=1000,
                                    description="Additional criteria, e.g. '年营收5000万以上, 有海外业务'")
    count: int = Field(default=10, ge=1, le=50,
                       description="How many leads to discover")
    auto_enrich: bool = Field(default=True,
                              description="Whether to auto-enrich discovered leads")


class LeadScoringRequest(BaseModel):
    """Score a batch of leads for conversion likelihood."""
    lead_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)


class LeadEnrichmentRequest(BaseModel):
    """Enrich a lead with company info, social data, etc."""
    lead_id: uuid.UUID


class LeadOutreachRequest(BaseModel):
    """Generate a personalized outreach message for a lead."""
    lead_id: uuid.UUID
    channel: str = Field(default="email", pattern="^(email|linkedin)$")
    tone: str = Field(default="professional",
                      pattern="^(professional|warm|casual|formal)$")
    context: Optional[str] = Field(None, max_length=500,
                                   description="Additional context for personalization")


class LeadBulkStatusUpdate(BaseModel):
    lead_ids: list[uuid.UUID]
    status: str = Field(..., pattern="^(discovered|contacted|qualified|converted|dismissed)$")


class LeadConvertRequest(BaseModel):
    """Convert a qualified lead into a CRM Contact + Pipeline entry."""
    lead_id: uuid.UUID
    deal_value: Optional[float] = None
    pipeline_stage: str = Field(default="discovery",
                                pattern="^(discovery|proposal|negotiation|closed_won|closed_lost)$")


# ── Lead Gen Status ─────────────────────────────────────────────────

class LeadGenStatsResponse(BaseModel):
    total_leads: int = 0
    by_status: dict[str, int] = {}
    avg_score: float = 0.0
    high_value: int = 0         # score >= 80
    contacted: int = 0
    converted: int = 0
    discovery_today: int = 0    # leads discovered today
    daily_quota_remaining: int = 0


class LeadDiscoveryResponse(BaseModel):
    leads: list[LeadCreate]
    total_discovered: int
    conversation: Optional[str] = None  # Gemini's reasoning narrative


class LeadScoringResponse(BaseModel):
    results: list[dict]  # [{lead_id, score, reasoning}]
