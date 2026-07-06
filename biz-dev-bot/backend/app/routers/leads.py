"""Lead Generation API — AI-powered lead discovery, scoring, and outreach."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.lead import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadListResponse,
    LeadDiscoveryRequest,
    LeadDiscoveryResponse,
    LeadScoringRequest,
    LeadScoringResponse,
    LeadEnrichmentRequest,
    LeadOutreachRequest,
    LeadBulkStatusUpdate,
    LeadConvertRequest,
    LeadGenStatsResponse,
)
from app.services.lead_gen import LeadGenService

router = APIRouter(prefix="/api/leads", tags=["leads"])


def get_lead_service(db: AsyncSession = Depends(get_db)) -> LeadGenService:
    return LeadGenService(db)


# ── Stats ─────────────────────────────────────────────────────────

@router.get("/stats", response_model=LeadGenStatsResponse)
async def lead_gen_stats(
    service: LeadGenService = Depends(get_lead_service),
    _: str = Depends(get_current_user),
):
    """Get lead generation statistics for the dashboard."""
    stats = await service.get_stats()
    return stats


# ── AI Lead Discovery ────────────────────────────────────────────

@router.post("/discover", response_model=LeadDiscoveryResponse)
async def discover_leads(
    req: LeadDiscoveryRequest,
    current_user: str = Depends(get_current_user),
    service: LeadGenService = Depends(get_lead_service),
):
    """Use Gemini AI to discover new leads based on industry and criteria."""
    if not service.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead generation is not configured. Set LEAD_GEN_ENABLED=true "
                   "and GEMINI_API_KEY in .env.",
        )
    return await service.discover_leads(
        industry=req.industry,
        region=req.region or "",
        criteria=req.criteria or "",
        count=req.count,
        auto_enrich=req.auto_enrich,
        current_user=current_user,
    )


# ── AI Lead Scoring ──────────────────────────────────────────────

@router.post("/score", response_model=LeadScoringResponse)
async def score_leads(
    req: LeadScoringRequest,
    _: str = Depends(get_current_user),
    service: LeadGenService = Depends(get_lead_service),
):
    """Batch-score leads for conversion likelihood using Gemini."""
    if not service.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead generation is not configured.",
        )
    return await service.score_leads(req.lead_ids)


# ── AI Lead Enrichment ───────────────────────────────────────────

@router.post("/enrich", response_model=dict)
async def enrich_lead(
    req: LeadEnrichmentRequest,
    _: str = Depends(get_current_user),
    service: LeadGenService = Depends(get_lead_service),
):
    """Deep-enrich a lead with company info, tech stack, signals."""
    if not service.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead generation is not configured.",
        )
    try:
        result = await service.enrich_lead(req.lead_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── AI Smart Outreach ────────────────────────────────────────────

@router.post("/outreach", response_model=dict)
async def generate_outreach(
    req: LeadOutreachRequest,
    _: str = Depends(get_current_user),
    service: LeadGenService = Depends(get_lead_service),
):
    """Generate a personalized outreach message for a lead."""
    if not service.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead generation is not configured.",
        )
    try:
        result = await service.generate_outreach(
            lead_id=req.lead_id,
            channel=req.channel,
            tone=req.tone,
            context=req.context or "",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Convert Lead → CRM Contact ───────────────────────────────────

@router.post("/convert", response_model=dict)
async def convert_lead(
    req: LeadConvertRequest,
    _: str = Depends(get_current_user),
    service: LeadGenService = Depends(get_lead_service),
):
    """Convert a qualified lead into a CRM Contact + Pipeline entry."""
    try:
        result = await service.convert_to_contact(
            lead_id=req.lead_id,
            deal_value=req.deal_value,
            pipeline_stage=req.pipeline_stage,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Bulk Status Update ───────────────────────────────────────────

@router.post("/bulk-status", response_model=dict)
async def bulk_update_status(
    req: LeadBulkStatusUpdate,
    _: str = Depends(get_current_user),
    service: LeadGenService = Depends(get_lead_service),
):
    """Update status for multiple leads at once."""
    updated = 0
    for lid in req.lead_ids:
        try:
            await service.update_lead(lid, LeadUpdate(status=req.status))
            updated += 1
        except Exception:
            pass
    return {"success": True, "updated": updated, "total": len(req.lead_ids)}


# ── CRUD ─────────────────────────────────────────────────────────

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    service: LeadGenService = Depends(get_lead_service),
    _: str = Depends(get_current_user),
):
    """Manually create a lead."""
    lead = await service.create_lead(data)
    return lead


@router.get("", response_model=LeadListResponse)
async def list_leads(
    status: str = Query(None),
    source: str = Query(None),
    min_score: float = Query(0.0, ge=0.0, le=100.0),
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: LeadGenService = Depends(get_lead_service),
    _: str = Depends(get_current_user),
):
    """List leads with optional filtering."""
    items, total = await service.list_leads(
        status=status or "",
        source=source or "",
        min_score=min_score,
        search=search or "",
        skip=skip,
        limit=limit,
    )
    return LeadListResponse(items=items, total=total)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: uuid.UUID,
    service: LeadGenService = Depends(get_lead_service),
    _: str = Depends(get_current_user),
):
    """Get a specific lead by ID."""
    lead = await service.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: uuid.UUID,
    data: LeadUpdate,
    service: LeadGenService = Depends(get_lead_service),
    _: str = Depends(get_current_user),
):
    """Update a lead."""
    lead = await service.update_lead(lead_id, data)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: uuid.UUID,
    service: LeadGenService = Depends(get_lead_service),
    _: str = Depends(get_current_user),
):
    """Delete a lead."""
    deleted = await service.delete_lead(lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead not found")

# ── Agent endpoints ─────────────────────────────────────────

@router.post("/agent/run", response_model=dict)
async def run_agent_pipeline(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run the full Lead Gen Agent pipeline (Eyes → Brain → Mouth)."""
    from app.services.lead_gen_agent import LeadGenAgent
    agent = LeadGenAgent(db)
    if not agent.enabled:
        raise HTTPException(status_code=400, detail="Agent not configured. Set GEMINI_API_KEY and LEAD_GEN_ENABLED.")
    result = await agent.run_full_pipeline()
    return result


@router.post("/agent/eyes", response_model=dict)
async def agent_eyes(
    keywords: str = "HVAC installer solar panels distributor",
    region: str = "Latin America",
    count: int = 20,
    _: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent Step 1: Discover leads via AI search."""
    from app.services.lead_gen_agent import LeadGenAgent
    agent = LeadGenAgent(db)
    if not agent.enabled:
        raise HTTPException(status_code=400, detail="Agent not configured.")
    leads = await agent.step_eyes(keywords=keywords, region=region, count=count)
    return {"discovered": len(leads), "leads": leads}


@router.post("/agent/brain", response_model=dict)
async def agent_brain(
    limit: int = 10,
    _: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent Step 2: Analyze leads by reading their websites."""
    from app.services.lead_gen_agent import LeadGenAgent
    agent = LeadGenAgent(db)
    if not agent.enabled:
        raise HTTPException(status_code=400, detail="Agent not configured.")
    results = await agent.step_brain(limit=limit)
    return {"analyzed": len(results), "results": results}


@router.post("/agent/mouth", response_model=dict)
async def agent_mouth(
    lead_ids: list[str] = Query(None),
    channel: str = "email",
    tone: str = "professional",
    _: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent Step 3: Generate outreach messages for qualified leads."""
    from app.services.lead_gen_agent import LeadGenAgent
    agent = LeadGenAgent(db)
    if not agent.enabled:
        raise HTTPException(status_code=400, detail="Agent not configured.")
    # If no IDs specified, get all qualified leads
    if not lead_ids:
        from app.models.lead import Lead
        from sqlalchemy import select
        result = await db.execute(
            select(Lead.id).where(Lead.status == "qualified", Lead.outreach_template.is_(None))
        )
        lead_ids = [str(row[0]) for row in result.all()]
    results = await agent.step_mouth(lead_ids=lead_ids, channel=channel, tone=tone)
    return {"generated": len(results), "messages": results}


@router.post("/agent/hands", response_model=dict)
async def agent_hands(
    lead_ids: list[str] = Query(None),
    channel: str = "email",
    _: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent Step 4: Send outreach messages."""
    from app.services.lead_gen_agent import LeadGenAgent
    agent = LeadGenAgent(db)
    if not agent.enabled:
        raise HTTPException(status_code=400, detail="Agent not configured.")
    if not lead_ids:
        from app.models.lead import Lead
        from sqlalchemy import select
        result = await db.execute(
            select(Lead.id).where(
                Lead.status == "qualified",
                Lead.outreach_template.isnot(None),
                Lead.outreach_sent_at.is_(None),
            )
        )
        lead_ids = [str(row[0]) for row in result.all()]
    results = await agent.step_hands(lead_ids=lead_ids, channel=channel)
    return {"sent": len(results), "results": results}


@router.get("/agent/stats", response_model=dict)
async def agent_stats(
    _: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get agent statistics."""
    from app.services.lead_gen_agent import LeadGenAgent
    agent = LeadGenAgent(db)
    return await agent.get_agent_stats()
