import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.pipeline import PipelineCreate, PipelineResponse, PipelineStageUpdate, PipelineUpdate
from app.services.pipeline import PipelineService

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])


def get_pipeline_service(db: AsyncSession = Depends(get_db)) -> PipelineService:
    return PipelineService(db)


@router.post("", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    data: PipelineCreate,
    service: PipelineService = Depends(get_pipeline_service),
    _: str = Depends(get_current_user),
):
    return await service.create(data)


@router.get("", response_model=list[PipelineResponse])
async def list_pipelines(
    stage: str = Query(None),
    contact_id: uuid.UUID = Query(None),
    service: PipelineService = Depends(get_pipeline_service),
    _: str = Depends(get_current_user),
):
    if contact_id:
        return await service.list_by_contact(contact_id)
    items, _ = await service.list_by_stage(stage=stage)
    return items


@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: uuid.UUID,
    service: PipelineService = Depends(get_pipeline_service),
    _: str = Depends(get_current_user),
):
    pipeline = await service.get(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: uuid.UUID,
    data: PipelineUpdate,
    service: PipelineService = Depends(get_pipeline_service),
    _: str = Depends(get_current_user),
):
    pipeline = await service.update(pipeline_id, data)
    if not pipeline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    return pipeline


@router.put("/{pipeline_id}/stage", response_model=PipelineResponse)
async def update_pipeline_stage(
    pipeline_id: uuid.UUID,
    data: PipelineStageUpdate,
    service: PipelineService = Depends(get_pipeline_service),
    _: str = Depends(get_current_user),
):
    pipeline = await service.update_stage(pipeline_id, data.stage)
    if not pipeline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: uuid.UUID,
    service: PipelineService = Depends(get_pipeline_service),
    _: str = Depends(get_current_user),
):
    deleted = await service.delete(pipeline_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
