import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.services.notification import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: Optional[str] = None
    notification_type: str = "info"
    is_read: bool = False
    link_url: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int


class UnreadCountResponse(BaseModel):
    count: int


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    svc = NotificationService(db)
    items, total = await svc.list(
        username=current_user, unread_only=unread_only, skip=skip, limit=limit
    )
    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=str(n.id),
                title=n.title,
                message=n.message,
                notification_type=n.notification_type,
                is_read=n.is_read,
                link_url=n.link_url,
                created_at=n.created_at.isoformat() if n.created_at else None,
            )
            for n in items
        ],
        total=total,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    svc = NotificationService(db)
    count = await svc.unread_count(username=current_user)
    return UnreadCountResponse(count=count)


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    svc = NotificationService(db)
    notif = await svc.mark_read(notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.post("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    svc = NotificationService(db)
    count = await svc.mark_all_read(current_user)
    return {"message": f"Marked {count} notification(s) as read", "count": count}
