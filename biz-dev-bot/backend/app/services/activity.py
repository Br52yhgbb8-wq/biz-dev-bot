import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityUpdate


class ActivityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ActivityCreate, created_by: str = "") -> Activity:
        activity = Activity(**data.model_dump(), created_by=created_by)
        self.db.add(activity)
        await self.db.commit()
        await self.db.refresh(activity)
        return activity

    async def get(self, activity_id: uuid.UUID) -> Optional[Activity]:
        result = await self.db.execute(
            select(Activity).where(Activity.id == activity_id)
        )
        return result.scalar_one_or_none()

    async def list_by_contact(
        self,
        contact_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
        activity_type: Optional[str] = None,
    ) -> tuple[list[Activity], int]:
        query = select(Activity).where(Activity.contact_id == contact_id)
        count_query = select(func.count(Activity.id)).where(
            Activity.contact_id == contact_id
        )

        if activity_type:
            query = query.where(Activity.type == activity_type)
            count_query = count_query.where(Activity.type == activity_type)

        total = (await self.db.execute(count_query)).scalar() or 0
        result = await self.db.execute(
            query.order_by(Activity.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 50,
        activity_type: Optional[str] = None,
        days: Optional[int] = None,
    ) -> tuple[list[Activity], int]:
        query = select(Activity)
        count_query = select(func.count(Activity.id))

        if activity_type:
            query = query.where(Activity.type == activity_type)
            count_query = count_query.where(Activity.type == activity_type)

        if days:
            since = datetime.now(timezone.utc) - timedelta(days=days)
            query = query.where(Activity.created_at >= since)
            count_query = count_query.where(Activity.created_at >= since)

        total = (await self.db.execute(count_query)).scalar() or 0
        result = await self.db.execute(
            query.order_by(Activity.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def update(
        self, activity_id: uuid.UUID, data: ActivityUpdate
    ) -> Optional[Activity]:
        activity = await self.get(activity_id)
        if not activity:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(activity, key, value)
        await self.db.commit()
        await self.db.refresh(activity)
        return activity

    async def delete(self, activity_id: uuid.UUID) -> bool:
        activity = await self.get(activity_id)
        if not activity:
            return False
        await self.db.delete(activity)
        await self.db.commit()
        return True
