from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.dashboard import (
    ActivityTrendResponse,
    CampaignStatsSummary,
    DashboardResponse,
    PipelineOverviewResponse,
)
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


@router.get("/pipeline-overview", response_model=PipelineOverviewResponse)
async def pipeline_overview(
    svc: DashboardService = Depends(get_dashboard_service),
    _: str = Depends(get_current_user),
):
    return await svc.pipeline_overview()


@router.get("/activity-trend", response_model=ActivityTrendResponse)
async def activity_trend(
    days: int = Query(30, ge=7, le=365),
    svc: DashboardService = Depends(get_dashboard_service),
    _: str = Depends(get_current_user),
):
    return await svc.activity_trend(days)


@router.get("/campaign-stats", response_model=CampaignStatsSummary)
async def campaign_stats(
    svc: DashboardService = Depends(get_dashboard_service),
    _: str = Depends(get_current_user),
):
    return await svc.campaign_stats()


@router.get("/full", response_model=DashboardResponse)
async def full_dashboard(
    days: int = Query(30, ge=7, le=365),
    svc: DashboardService = Depends(get_dashboard_service),
    _: str = Depends(get_current_user),
):
    return await svc.full_dashboard(trend_days=days)
