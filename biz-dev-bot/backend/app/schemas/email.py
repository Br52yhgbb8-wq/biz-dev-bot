
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EmailSendRequest(BaseModel):
    to: list[str]
    subject: str
    body_text: str
    cc: Optional[list[str]] = None
    contact_id: Optional[uuid.UUID] = None


class GmailThreadResponse(BaseModel):
    id: str
    subject: str
    from_: str = ""
    to: str = ""
    date: str = ""
    snippet: str = ""
    message_count: int = 0
    is_read: bool = True


class GmailMessageResponse(BaseModel):
    id: str
    from_: str = ""
    to: str = ""
    subject: str = ""
    date: str = ""
    body: str = ""


class GmailThreadDetailResponse(BaseModel):
    id: str
    messages: list[GmailMessageResponse]


class GmailAuthUrlResponse(BaseModel):
    auth_url: str


class GmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    credentials_configured: bool
