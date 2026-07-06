import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_message import EmailTemplate
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate


class EmailTemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: EmailTemplateCreate) -> EmailTemplate:
        tpl = EmailTemplate(**data.model_dump())
        self.db.add(tpl)
        await self.db.commit()
        await self.db.refresh(tpl)
        return tpl

    async def get(self, template_id: uuid.UUID) -> Optional[EmailTemplate]:
        result = await self.db.execute(
            select(EmailTemplate).where(EmailTemplate.id == template_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self, skip: int = 0, limit: int = 50
    ) -> tuple[list[EmailTemplate], int]:
        total = (
            await self.db.execute(select(func.count(EmailTemplate.id)))
        ).scalar() or 0
        result = await self.db.execute(
            select(EmailTemplate)
            .order_by(EmailTemplate.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def update(
        self, template_id: uuid.UUID, data: EmailTemplateUpdate
    ) -> Optional[EmailTemplate]:
        tpl = await self.get(template_id)
        if not tpl:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tpl, key, value)
        await self.db.commit()
        await self.db.refresh(tpl)
        return tpl

    async def delete(self, template_id: uuid.UUID) -> bool:
        tpl = await self.get(template_id)
        if not tpl:
            return False
        await self.db.delete(tpl)
        await self.db.commit()
        return True

    def render(self, tpl: EmailTemplate, variables: dict) -> tuple[str, str]:
        """Simple variable substitution in template subject/body."""
        subject = tpl.subject
        body = tpl.body_text
        for key, value in variables.items():
            placeholder = "{{" + key + "}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        return subject, body
