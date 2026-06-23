import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class PipelineCreate(BaseModel):
    contact_id: uuid.UUID
    stage: str = "discovery"
    deal_value: Optional[Decimal] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    owner_id: Optional[str] = None


class PipelineUpdate(BaseModel):
    stage: Optional[str] = None
    deal_value: Optional[Decimal] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    owner_id: Optional[str] = None


class PipelineStageUpdate(BaseModel):
    stage: str


class PipelineResponse(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    stage: str
    deal_value: Optional[Decimal] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    owner_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
