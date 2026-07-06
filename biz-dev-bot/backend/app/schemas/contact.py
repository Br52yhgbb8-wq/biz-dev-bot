import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ContactCreate(BaseModel):
    name: str
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    source: str = "manual"
    tags: list[str] = []
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    linkedin_profile: Optional[dict] = None
    source: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class ContactResponse(BaseModel):
    id: uuid.UUID
    name: str
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    linkedin_profile: Optional[dict] = None
    source: str
    tags: list[str] = []
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
class BatchTagRequest(BaseModel):
    contact_ids: list[uuid.UUID]
    tags: list[str]
    action: str = "add"  # "add" or "remove"


class BatchIdsRequest(BaseModel):
    contact_ids: list[uuid.UUID]


class BatchDeleteRequest(BaseModel):
    contact_ids: list[uuid.UUID]


class BatchOperationResponse(BaseModel):
    success: bool
    count: int
    message: str
