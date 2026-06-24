import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pipeline import Pipeline
from app.schemas.pipeline import PipelineCreate, PipelineUpdate


class PipelineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: PipelineCreate) -> Pipeline:
        pipeline = Pipeline(**data.model_dump())
        self.db.add(pipeline)
        await self.db.commit()
        await self.db.refresh(pipeline)
        return pipeline

    async def get(self, pipeline_id: uuid.UUID) -> Optional[Pipeline]:
        result = await self.db.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
        return result.scalar_one_or_none()

    async def list_by_contact(self, contact_id: uuid.UUID) -> list[Pipeline]:
        result = await self.db.execute(
            select(Pipeline).where(Pipeline.contact_id == contact_id).order_by(Pipeline.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_by_stage(self, stage: Optional[str] = None) -> tuple[list[Pipeline], int]:
        query = select(Pipeline)
        count_query = select(func.count(Pipeline.id))
        if stage:
            query = query.where(Pipeline.stage == stage)
            count_query = count_query.where(Pipeline.stage == stage)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        result = await self.db.execute(query.order_by(Pipeline.created_at.desc()))
        return list(result.scalars().all()), total

    async def update_stage(self, pipeline_id: uuid.UUID, stage: str) -> Optional[Pipeline]:
        pipeline = await self.get(pipeline_id)
        if not pipeline:
            return None
        pipeline.stage = stage
        await self.db.commit()
        await self.db.refresh(pipeline)
        return pipeline

    async def update(self, pipeline_id: uuid.UUID, data: PipelineUpdate) -> Optional[Pipeline]:
        pipeline = await self.get(pipeline_id)
        if not pipeline:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pipeline, key, value)
        await self.db.commit()
        await self.db.refresh(pipeline)
        return pipeline

    async def delete(self, pipeline_id: uuid.UUID) -> bool:
        pipeline = await self.get(pipeline_id)
        if not pipeline:
            return False
        await self.db.delete(pipeline)
        await self.db.commit()
        return True
