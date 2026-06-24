
import asyncio
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.email import (
    EmailSendRequest,
    GmailAuthUrlResponse,
    GmailMessageResponse,
    GmailStatusResponse,
    GmailThreadDetailResponse,
    GmailThreadResponse,
)
from app.services.gmail import GmailService

router = APIRouter(prefix="/api/email", tags=["email"])
executor = ThreadPoolExecutor(max_workers=2)

# Singleton service instance
gmail_service = GmailService()


@router.get("/status", response_model=GmailStatusResponse)
async def gmail_status(_: str = Depends(get_current_user)):
    """Check Gmail connection status."""
    email = ""
    if gmail_service.is_authenticated:
        try:
            email = gmail_service._get_user_email()
        except Exception:
            pass
    return GmailStatusResponse(
        connected=gmail_service.is_authenticated,
        email=email or None,
        credentials_configured=gmail_service.credentials_exist,
    )


@router.get("/auth-url", response_model=GmailAuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query("http://localhost:8000/api/email/callback"),
    _: str = Depends(get_current_user),
):
    """Get Google OAuth authorization URL."""
    try:
        auth_url = gmail_service.get_auth_url(redirect_uri)
        return GmailAuthUrlResponse(auth_url=auth_url)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    redirect_uri: str = Query("http://localhost:8000/api/email/callback"),
    _: str = Depends(get_current_user),
):
    """Handle OAuth callback from Google."""
    try:
        result = gmail_service.handle_callback(code, redirect_uri)
        return {"message": "Gmail connected", "email": result["email"]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth failed: {str(e)}",
        )


@router.get("/threads", response_model=list[GmailThreadResponse])
async def list_threads(
    max_results: int = Query(20, ge=1, le=100),
    _: str = Depends(get_current_user),
):
    """List Gmail inbox threads."""
    try:
        threads = await _run_in_executor(gmail_service.list_threads, max_results)
        result = []
        for t in threads:
            result.append(GmailThreadResponse(
                id=t["id"],
                subject=t["subject"],
                from_=t["from"],
                to=t["to"],
                date=t["date"],
                snippet=t["snippet"],
                message_count=t["message_count"],
                is_read="UNREAD" not in t.get("label_ids", []),
            ))
        return result
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Gmail not authenticated: {str(e)}",
        )


@router.get("/threads/{thread_id}", response_model=GmailThreadDetailResponse)
async def get_thread(thread_id: str, _: str = Depends(get_current_user)):
    """Get full thread details."""
    try:
        thread = await _run_in_executor(gmail_service.get_thread, thread_id)
        messages = []
        for m in thread["messages"]:
            messages.append(GmailMessageResponse(
                id=m["id"],
                subject=m["subject"],
                from_=m["from"],
                to=m["to"],
                date=m["date"],
                body=m["body"],
            ))
        return GmailThreadDetailResponse(id=thread_id, messages=messages)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/send")
async def send_email(
    data: EmailSendRequest,
    _: str = Depends(get_current_user),
):
    """Send an email via Gmail."""
    try:
        result = await _run_in_executor(
            gmail_service.send_email, data.to, data.subject,
            data.body_text, data.cc or []
        )
        return {"message_id": result["id"], "thread_id": result["thread_id"]}
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/sync")
async def sync_emails(
    max_results: int = 50,
    _: str = Depends(get_current_user),
):
    """Trigger Gmail inbox sync."""
    try:
        from app.database import async_session_factory
        async with async_session_factory() as db:
            result = await _run_in_executor(gmail_service.sync_inbox, db, max_results)
        return result
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


async def _run_in_executor(func, *args):
    """Run a synchronous function in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, func, *args)
