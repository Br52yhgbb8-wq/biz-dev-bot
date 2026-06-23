from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity
from app.models.campaign import Campaign
from app.models.email_message import EmailMessage
from app.models.pipeline import Pipeline


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def pipeline_overview(self):
        """Return pipeline stats: totals, win rate, and per-stage breakdown."""
        result = await self.db.execute(select(Pipeline))
        pipelines = result.scalars().all()

        total_deals = len(pipelines)
        total_value = sum(
            float(p.deal_value or 0) for p in pipelines
        )

        won = sum(1 for p in pipelines if p.stage == "closed_won")
        lost = sum(1 for p in pipelines if p.stage == "closed_lost")
        closed = won + lost
        win_rate = (won / closed * 100) if closed > 0 else 0.0

        stage_map: dict[str, dict] = {}
        for p in pipelines:
            s = p.stage
            if s not in stage_map:
                stage_map[s] = {"stage": s, "count": 0, "total_value": 0.0}
            stage_map[s]["count"] += 1
            stage_map[s]["total_value"] += float(p.deal_value or 0)

        stages = sorted(stage_map.values(), key=lambda x: x["stage"])

        return {
            "total_deals": total_deals,
            "total_value": total_value,
            "win_rate": round(win_rate, 1),
            "stages": stages,
        }

    async def activity_trend(self, days: int = 30):
        """Return activity counts per day for the last N days."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        rows = (
            await self.db.execute(
                select(
                    func.date(Activity.completed_at).label("day"),
                    func.count(Activity.id).label("cnt"),
                )
                .where(Activity.completed_at >= since)
                .group_by(func.date(Activity.completed_at))
                .order_by(func.date(Activity.completed_at))
            )
        ).all()

        trend_map: dict[str, int] = {}
        total_activities = 0
        for row in rows:
            day_str = str(row.day)
            trend_map[day_str] = row.cnt
            total_activities += row.cnt

        # Fill in missing days with zero
        trend = []
        for i in range(days):
            day = (since + timedelta(days=i)).strftime("%Y-%m-%d")
            trend.append({"date": day, "count": trend_map.get(day, 0)})

        return {"trend": trend, "total": total_activities}

    async def campaign_stats(self):
        """Return campaign summary stats."""
        total = (
            await self.db.execute(select(func.count(Campaign.id)))
        ).scalar() or 0

        running = (
            await self.db.execute(
                select(func.count(Campaign.id)).where(Campaign.status == "running")
            )
        ).scalar() or 0

        completed = (
            await self.db.execute(
                select(func.count(Campaign.id)).where(Campaign.status == "completed")
            )
        ).scalar() or 0

        draft = (
            await self.db.execute(
                select(func.count(Campaign.id)).where(Campaign.status == "draft")
            )
        ).scalar() or 0

        total_sent = (
            await self.db.execute(select(func.count(EmailMessage.id)))
        ).scalar() or 0

        return {
            "total": total,
            "running": running,
            "completed": completed,
            "draft": draft,
            "total_sent": total_sent,
        }

    async def full_dashboard(self, trend_days: int = 30):
        """Convenience: return everything in one call."""
        pipeline = await self.pipeline_overview()
        activity_trend = await self.activity_trend(trend_days)
        campaign = await self.campaign_stats()
        return {
            "pipeline": pipeline,
            "activity_trend": activity_trend,
            "campaign": campaign,
        }
