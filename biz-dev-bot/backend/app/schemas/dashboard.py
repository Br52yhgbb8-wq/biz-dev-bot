from datetime import date
from typing import Optional

from pydantic import BaseModel


class PipelineStageCount(BaseModel):
    stage: str
    count: int
    total_value: float = 0.0


class PipelineOverviewResponse(BaseModel):
    total_deals: int
    total_value: float = 0.0
    win_rate: float = 0.0
    stages: list[PipelineStageCount]


class ActivityTrendPoint(BaseModel):
    date: str
    count: int


class ActivityTrendResponse(BaseModel):
    trend: list[ActivityTrendPoint]
    total: int


class CampaignStatsSummary(BaseModel):
    total: int
    running: int
    completed: int
    draft: int
    total_sent: int = 0


class DashboardResponse(BaseModel):
    pipeline: PipelineOverviewResponse
    activity_trend: ActivityTrendResponse
    campaign: CampaignStatsSummary
