from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SearchContactResult(BaseModel):
    id: str
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    title: Optional[str] = None
    tags: list[str] = []
    match_field: str = ""


class SearchEmailResult(BaseModel):
    id: str
    subject: str
    from_addr: str
    to_addrs: list[str]
    snippet: str
    sent_at: Optional[datetime] = None


class SearchActivityResult(BaseModel):
    id: str
    type: str
    description: Optional[str] = None
    contact_name: Optional[str] = None
    created_at: Optional[datetime] = None


class GlobalSearchResponse(BaseModel):
    contacts: list[SearchContactResult] = []
    emails: list[SearchEmailResult] = []
    activities: list[SearchActivityResult] = []
    total: int = 0
