import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.schemas.scheduler import CampaignCreate, CampaignUpdate


class CampaignService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: CampaignCreate) -> Campaign:
        campaign = Campaign(**data.model_dump())
        self.db.add(campaign)
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign

    async def get(self, campaign_id: uuid.UUID) -> Optional[Campaign]:
        result = await self.db.execute(select(Campaign).where(Campaign.id == campaign_id))
        return result.scalar_one_or_none()

    async def list(self, skip: int = 0, limit: int = 50) -> tuple[list[Campaign], int]:
        total_q = select(func.count(Campaign.id))
        total = (await self.db.execute(total_q)).scalar() or 0
        result = await self.db.execute(
            select(Campaign).order_by(Campaign.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def update(self, campaign_id: uuid.UUID, data: CampaignUpdate) -> Optional[Campaign]:
        campaign = await self.get(campaign_id)
        if not campaign:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(campaign, key, value)
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign

    async def delete(self, campaign_id: uuid.UUID) -> bool:
        campaign = await self.get(campaign_id)
        if not campaign:
            return False
        await self.db.delete(campaign)
        await self.db.commit()
        return True

    async def start_campaign(self, campaign_id: uuid.UUID) -> Optional[Campaign]:
        """Start a campaign: set status to running, schedule first step."""
        campaign = await self.get(campaign_id)
        if not campaign:
            return None
        campaign.status = "running"
        campaign.started_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(campaign)

        # Schedule the first campaign step
        sequence = campaign.sequence or []
        if sequence:
            from app.services.scheduler import schedule_task
            first_step = sequence[0]
            delay_days = first_step.get("delay_days", 0)
            from datetime import timedelta
            run_date = datetime.now(timezone.utc) + timedelta(days=delay_days)
            schedule_task(
                task_type="campaign_step",
                run_date=run_date,
                payload={
                    "campaign_id": str(campaign.id),
                    "step_index": 0,
                    "step": first_step,
                },
            )
        return campaign

    async def pause_campaign(self, campaign_id: uuid.UUID) -> Optional[Campaign]:
        campaign = await self.get(campaign_id)
        if not campaign:
            return None
        campaign.status = "paused"
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign

    async def resume_campaign(self, campaign_id: uuid.UUID) -> Optional[Campaign]:
        campaign = await self.get(campaign_id)
        if not campaign:
            return None
        campaign.status = "running"
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign

    async def get_stats(self, campaign_id: uuid.UUID) -> dict:
        """Get campaign statistics (sent, opened, replied)."""
        campaign = await self.get(campaign_id)
        if not campaign:
            return {}
        from app.models.email_message import EmailMessage
        total_sent = (
            await self.db.execute(
                select(func.count(EmailMessage.id)).where(
                    EmailMessage.campaign_id == campaign_id
                )
            )
        ).scalar() or 0
        return {
            "status": campaign.status,
            "total_sent": total_sent,
            "started_at": campaign.started_at.isoformat() if campaign.started_at else None,
            "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None,
            "sequence_steps": len(campaign.sequence or []),
        }
