import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.email_template import (
    EmailTemplateCreate,
    EmailTemplateListResponse,
    EmailTemplatePreview,
    EmailTemplateRenderRequest,
    EmailTemplateResponse,
    EmailTemplateUpdate,
)
from app.services.email_template import EmailTemplateService

router = APIRouter(prefix="/api/email-templates", tags=["email-templates"])


def get_svc(db: AsyncSession = Depends(get_db)) -> EmailTemplateService:
    return EmailTemplateService(db)


@router.post("", response_model=EmailTemplateResponse, status_code=201)
async def create_template(
    data: EmailTemplateCreate,
    svc: EmailTemplateService = Depends(get_svc),
    _: str = Depends(get_current_user),
):
    return await svc.create(data)


@router.get("", response_model=EmailTemplateListResponse)
async def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    svc: EmailTemplateService = Depends(get_svc),
    _: str = Depends(get_current_user),
):
    items, total = await svc.list(skip=skip, limit=limit)
    return EmailTemplateListResponse(items=items, total=total)


@router.get("/{template_id}", response_model=EmailTemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    svc: EmailTemplateService = Depends(get_svc),
    _: str = Depends(get_current_user),
):
    tpl = await svc.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


@router.put("/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: EmailTemplateUpdate,
    svc: EmailTemplateService = Depends(get_svc),
    _: str = Depends(get_current_user),
):
    tpl = await svc.update(template_id, data)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    svc: EmailTemplateService = Depends(get_svc),
    _: str = Depends(get_current_user),
):
    deleted = await svc.delete(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")


@router.post("/render", response_model=EmailTemplatePreview)
async def render_template(
    req: EmailTemplateRenderRequest,
    svc: EmailTemplateService = Depends(get_svc),
    _: str = Depends(get_current_user),
):
    tpl = await svc.get(req.template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    subject, body_text = svc.render(tpl, req.variables)
    return EmailTemplatePreview(
        subject=subject,
        body_text=body_text,
        body_html=tpl.body_html,
    )
