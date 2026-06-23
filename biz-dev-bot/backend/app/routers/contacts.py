import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.contact import ContactCreate, ContactListResponse, ContactResponse, ContactUpdate
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
    limit: int = Query(50, ge=1, le=100),
    service: ContactService = Depends(get_contact_service),
    _: str = Depends(get_current_user),
):
    items, total = await service.list(search=search, tag=tag, source=source, skip=skip, limit=limit)
    return ContactListResponse(items=items, total=total)


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
