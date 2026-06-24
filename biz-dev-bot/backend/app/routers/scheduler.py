import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.scheduler import (
    CampaignCreate,
    CampaignListResponse,
    CampaignResponse,
    CampaignStatsResponse,
    CampaignUpdate,
    ScheduleFollowUpRequest,
    ScheduleFollowUpResponse,
    ScheduledJobResponse,
)
from app.services.campaign import CampaignService
from app.services.scheduler import (
    cancel_task,
    get_scheduled_jobs,
    schedule_task,
)

router = APIRouter(tags=["campaigns"])


def get_campaign_service(db: AsyncSession = Depends(get_db)) -> CampaignService:
    return CampaignService(db)


# ── Campaign CRUD ──


@router.post("/api/campaigns", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    data: CampaignCreate,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    return await svc.create(data)


@router.get("/api/campaigns", response_model=CampaignListResponse)
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    items, total = await svc.list(skip=skip, limit=limit)
    return CampaignListResponse(items=items, total=total)


@router.get("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: uuid.UUID,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    campaign = await svc.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    campaign = await svc.update(campaign_id, data)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.delete("/api/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: uuid.UUID,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    deleted = await svc.delete(campaign_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign not found")


# ── Campaign Actions ──


@router.post("/api/campaigns/{campaign_id}/start", response_model=CampaignResponse)
async def start_campaign(
    campaign_id: uuid.UUID,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    campaign = await svc.start_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/api/campaigns/{campaign_id}/pause", response_model=CampaignResponse)
async def pause_campaign(
    campaign_id: uuid.UUID,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    campaign = await svc.pause_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/api/campaigns/{campaign_id}/resume", response_model=CampaignResponse)
async def resume_campaign(
    campaign_id: uuid.UUID,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    campaign = await svc.resume_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/api/campaigns/{campaign_id}/stats", response_model=CampaignStatsResponse)
async def campaign_stats(
    campaign_id: uuid.UUID,
    svc: CampaignService = Depends(get_campaign_service),
    _: str = Depends(get_current_user),
):
    stats = await svc.get_stats(campaign_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignStatsResponse(**stats)


# ── Scheduler / Follow-ups ──


@router.post("/api/scheduler/follow-ups", response_model=ScheduleFollowUpResponse)
async def schedule_follow_up(
    data: ScheduleFollowUpRequest,
    _: str = Depends(get_current_user),
):
    """Schedule a follow-up reminder for a pipeline deal."""
    job_id = schedule_task(
        task_type="follow_up",
        run_date=data.scheduled_at,
        payload={
            "pipeline_id": str(data.pipeline_id),
            "contact_id": str(data.contact_id),
            "message": data.message,
        },
    )
    return ScheduleFollowUpResponse(
        job_id=job_id,
        message=f"Follow-up scheduled for {data.scheduled_at.isoformat()}",
    )


@router.get("/api/scheduler/jobs", response_model=list[ScheduledJobResponse])
async def list_jobs(_: str = Depends(get_current_user)):
    """List all scheduled jobs."""
    jobs = get_scheduled_jobs()
    result = []
    for j in jobs:
        task_type = j["args"][0] if j["args"] else "unknown"
        result.append(ScheduledJobResponse(
            id=j["id"],
            name=j["name"] or task_type,
            next_run_time=j["next_run_time"],
            task_type=task_type,
        ))
    return result


@router.delete("/api/scheduler/jobs/{job_id}")
async def cancel_job(job_id: str, _: str = Depends(get_current_user)):
    """Cancel a scheduled job."""
    success = cancel_task(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job cancelled"}
