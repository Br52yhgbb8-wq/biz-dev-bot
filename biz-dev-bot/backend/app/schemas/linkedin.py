from typing import Optional
from pydantic import BaseModel


class LinkedInSearchRequest(BaseModel):
    keywords: str
    location: str = ""
    limit: int = 10


class LinkedInSearchResult(BaseModel):
    name: str
    title: str = ""
    location: str = ""
    profile_url: str = ""
    img_url: str = ""


class LinkedInProfileRequest(BaseModel):
    profile_url: str


class LinkedInProfileResponse(BaseModel):
    name: str = ""
    headline: str = ""
    about: str = ""
    profile_url: str = ""
    experience: list[dict] = []
    education: list[str] = []
    skills: list[str] = []


class LinkedInExportRequest(BaseModel):
    results: list[LinkedInSearchResult]


class LinkedInExportResponse(BaseModel):
    imported: int
    skipped: int
    total: int


class LinkedInStatusResponse(BaseModel):
    browser_running: bool
    logged_in: bool = False
    playwright_available: bool
