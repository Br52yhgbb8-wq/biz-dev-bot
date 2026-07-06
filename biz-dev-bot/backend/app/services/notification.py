import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        title: str,
        message: Optional[str] = None,
        notification_type: str = "info",
        link_url: Optional[str] = None,
        username: Optional[str] = None,
    ) -> Notification:
        notif = Notification(
            title=title,
            message=message,
            notification_type=notification_type,
            link_url=link_url,
            username=username,
        )
        self.db.add(notif)
        await self.db.commit()
        await self.db.refresh(notif)
        return notif

    async def list(
        self, username: Optional[str] = None, unread_only: bool = False,
        skip: int = 0, limit: int = 50,
    ) -> tuple[list[Notification], int]:
        query = select(Notification)
        count_query = select(func.count(Notification.id))

        if username:
            query = query.where(Notification.username == username)
            count_query = count_query.where(Notification.username == username)
        if unread_only:
            query = query.where(Notification.is_read == False)
            count_query = count_query.where(Notification.is_read == False)

        total = (await self.db.execute(count_query)).scalar() or 0
        result = await self.db.execute(
            query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def mark_read(self, notification_id: uuid.UUID) -> Optional[Notification]:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        notif = result.scalar_one_or_none()
        if not notif:
            return None
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(notif)
        return notif

    async def mark_all_read(self, username: str) -> int:
        result = await self.db.execute(
            select(Notification).where(
                Notification.username == username,
                Notification.is_read == False,
            )
        )
        notifs = list(result.scalars().all())
        now = datetime.now(timezone.utc)
        for n in notifs:
            n.is_read = True
            n.read_at = now
        await self.db.commit()
        return len(notifs)

    async def unread_count(self, username: Optional[str] = None) -> int:
        query = select(func.count(Notification.id)).where(Notification.is_read == False)
        if username:
            query = query.where(Notification.username == username)
        result = await self.db.execute(query)
        return result.scalar() or 0
