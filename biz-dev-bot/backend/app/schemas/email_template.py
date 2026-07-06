import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body_text: str
    body_html: Optional[str] = None


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None


class EmailTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    subject: str
    body_text: str
    body_html: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmailTemplateListResponse(BaseModel):
    items: list[EmailTemplateResponse]
    total: int


class EmailTemplatePreview(BaseModel):
    """A rendered preview of the template with variables filled in."""
    subject: str
    body_text: str
    body_html: Optional[str] = None


class EmailTemplateRenderRequest(BaseModel):
    template_id: uuid.UUID
    variables: dict = {}
