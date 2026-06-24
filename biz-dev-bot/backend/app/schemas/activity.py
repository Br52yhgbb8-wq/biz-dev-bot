import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ActivityCreate(BaseModel):
    contact_id: uuid.UUID
    pipeline_id: Optional[uuid.UUID] = None
    type: str = "note"
    description: Optional[str] = None
    outcome: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    meta: Optional[dict] = None


class ActivityUpdate(BaseModel):
    type: Optional[str] = None
    description: Optional[str] = None
    outcome: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    meta: Optional[dict] = None


class ActivityResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    pipeline_id: Optional[uuid.UUID] = None
    type: str
    description: Optional[str] = None
    outcome: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int


# Re-export constants for frontend use
ACTIVITY_TYPES = [
    ("email", "Email"),
    ("call", "Call"),
    ("meeting", "Meeting"),
    ("note", "Note"),
    ("linkedin", "LinkedIn"),
]
