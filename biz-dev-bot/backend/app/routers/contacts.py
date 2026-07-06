import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.contact import (
    BatchDeleteRequest, BatchIdsRequest,
    BatchOperationResponse,
    BatchTagRequest,
    ContactCreate,
    ContactListResponse,
    ContactResponse,
    ContactUpdate,
)
from app.services.contact import ContactService

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def get_contact_service(db: AsyncSession = Depends(get_db)) -> ContactService:
    return ContactService(db)


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    return await service.create(data)


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    search: str = Query(None),
    tag: str = Query(None),
    source: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    items, total = await service.list(search=search, tag=tag, source=source, skip=skip, limit=limit)
    return ContactListResponse(items=items, total=total)


# ── Batch Operations ──


@router.post("/batch/tag", response_model=BatchOperationResponse)
async def batch_tag_contacts(
    data: BatchTagRequest,
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    """Add or remove tags to selected contacts in one operation."""
    return await service.batch_tag(data.contact_ids, data.tags, data.action)


@router.post("/batch/delete", response_model=BatchOperationResponse)
async def batch_delete_contacts(
    data: BatchIdsRequest,
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    """Delete multiple contacts at once."""
    return await service.batch_delete(data.contact_ids)


@router.post("/batch/export-csv")
async def batch_export_contacts_csv(
    data: BatchDeleteRequest,
    svc: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    """Export selected contacts as CSV."""
    from fastapi.responses import StreamingResponse
    csv_content = await svc.batch_export_selected(data.contact_ids)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts-selected.csv"},
    )


# ── Bulk Export / Import ──


@router.get("/export-csv")
async def export_contacts_csv(
    svc: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    """Export all contacts as a CSV file."""
    from fastapi.responses import StreamingResponse
    csv_content = await svc.export_csv()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


@router.post("/import-csv")
async def import_contacts_csv(
    file: bytes = Body(),
    svc: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    """Import contacts from CSV content (multipart file upload)."""
    try:
        csv_text = file.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_text = file.decode("latin-1")
    result = await svc.import_csv(csv_text)
    return result


# ── Single Contact Operations ──


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: uuid.UUID,
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    contact = await service.get(contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: uuid.UUID,
    data: ContactUpdate,
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    contact = await service.update(contact_id, data)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID,
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    deleted = await service.delete(contact_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
