import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CampaignCreate(BaseModel):
    name: str
    target_filter: Optional[dict] = None
    email_template_id: Optional[uuid.UUID] = None
    sequence: list[dict] = []


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    target_filter: Optional[dict] = None
    sequence: Optional[list[dict]] = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    target_filter: Optional[dict] = None
    sequence: list[dict] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignListResponse(BaseModel):
    items: list[CampaignResponse]
    total: int


class CampaignStatsResponse(BaseModel):
    status: str
    total_sent: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    sequence_steps: int = 0


class ScheduleFollowUpRequest(BaseModel):
    pipeline_id: uuid.UUID
    contact_id: uuid.UUID
    scheduled_at: datetime
    message: str = ""


class ScheduledJobResponse(BaseModel):
    id: str
    name: str = ""
    next_run_time: Optional[str] = None
    task_type: str = ""


class ScheduleFollowUpResponse(BaseModel):
    job_id: str
    message: str
