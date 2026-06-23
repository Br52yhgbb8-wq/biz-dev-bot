import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ContactCreate) -> Contact:
        contact = Contact(**data.model_dump())
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def get(self, contact_id: uuid.UUID) -> Optional[Contact]:
        result = await self.db.execute(select(Contact).where(Contact.id == contact_id))
        return result.scalar_one_or_none()

    async def list(
        self, search: Optional[str] = None, tag: Optional[str] = None,
        source: Optional[str] = None, skip: int = 0, limit: int = 50,
    ) -> tuple[list[Contact], int]:
        query = select(Contact)
        count_query = select(func.count(Contact.id))

        if search:
            pattern = f"%{search}%"
            query = query.where(
                Contact.name.ilike(pattern)
                | Contact.company.ilike(pattern)
                | Contact.email.ilike(pattern)
            )
            count_query = count_query.where(
                Contact.name.ilike(pattern)
                | Contact.company.ilike(pattern)
                | Contact.email.ilike(pattern)
            )
        if tag:
            query = query.where(Contact.tags.contains([tag]))
            count_query = count_query.where(Contact.tags.contains([tag]))
        if source:
            query = query.where(Contact.source == source)
            count_query = count_query.where(Contact.source == source)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        result = await self.db.execute(
            query.order_by(Contact.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def update(self, contact_id: uuid.UUID, data: ContactUpdate) -> Optional[Contact]:
        contact = await self.get(contact_id)
        if not contact:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def delete(self, contact_id: uuid.UUID) -> bool:
        contact = await self.get(contact_id)
        if not contact:
            return False
        await self.db.delete(contact)
        await self.db.commit()
        return True
