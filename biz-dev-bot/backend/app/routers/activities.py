import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.activity import (
    ACTIVITY_TYPES,
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
    ActivityUpdate,
)
from app.services.activity import ActivityService

router = APIRouter(tags=["activities"])


def get_activity_service(db: AsyncSession = Depends(get_db)) -> ActivityService:
    return ActivityService(db)


@router.get(
    "/api/contacts/{contact_id}/activities",
    response_model=ActivityListResponse,
)
async def list_contact_activities(
    contact_id: uuid.UUID,
    activity_type: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    svc: ActivityService = Depends(get_activity_service),
    _: str = Depends(get_current_user),
):
    """Get activity timeline for a specific contact."""
    items, total = await svc.list_by_contact(
        contact_id, skip=skip, limit=limit, activity_type=activity_type
    )
    return ActivityListResponse(items=items, total=total)


@router.get("/api/activities", response_model=ActivityListResponse)
async def list_activities(
    activity_type: str = Query(None),
    days: int = Query(None, ge=1, le=365),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    svc: ActivityService = Depends(get_activity_service),
    _: str = Depends(get_current_user),
):
    """Get global activity timeline with optional filters."""
    items, total = await svc.list_all(
        skip=skip, limit=limit, activity_type=activity_type, days=days
    )
    return ActivityListResponse(items=items, total=total)


@router.post(
    "/api/activities",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_activity(
    data: ActivityCreate,
    svc: ActivityService = Depends(get_activity_service),
    current_user: str = Depends(get_current_user),
):
    """Record a new activity."""
    return await svc.create(data, created_by=current_user)


@router.get("/api/activities/types")
async def get_activity_types(_: str = Depends(get_current_user)):
    """Return list of available activity types."""
    return [{"key": k, "label": v} for k, v in ACTIVITY_TYPES]


@router.put("/api/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    svc: ActivityService = Depends(get_activity_service),
    _: str = Depends(get_current_user),
):
    activity = await svc.update(activity_id, data)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.delete("/api/activities/{activity_id}", status_code=204)
async def delete_activity(
    activity_id: uuid.UUID,
    svc: ActivityService = Depends(get_activity_service),
    _: str = Depends(get_current_user),
):
    deleted = await svc.delete(activity_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Activity not found")
