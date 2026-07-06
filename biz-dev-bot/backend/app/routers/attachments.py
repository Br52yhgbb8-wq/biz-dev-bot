import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import FileResponse

from app.database import get_db
from app.routers.auth import get_current_user
from app.services.attachment import AttachmentService, UPLOAD_DIR

router = APIRouter(prefix="/api/attachments", tags=["attachments"])


@router.post("/upload")
async def upload_attachment(
    file: UploadFile,
    contact_id: uuid.UUID = Query(None),
    email_message_id: uuid.UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Upload a file attachment."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    svc = AttachmentService(db)
    attachment = await svc.upload(
        file,
        contact_id=contact_id,
        email_message_id=email_message_id,
        uploaded_by=current_user,
    )
    return {
        "id": str(attachment.id),
        "original_name": attachment.original_name,
        "mime_type": attachment.mime_type,
        "file_size": attachment.file_size,
        "url": f"/api/attachments/{attachment.id}/download",
    }


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Download an attachment file."""
    svc = AttachmentService(db)
    attachment = await svc.get(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if not os.path.exists(attachment.storage_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        attachment.storage_path,
        media_type=attachment.mime_type,
        filename=attachment.original_name,
    )


@router.get("/by-contact/{contact_id}")
async def list_contact_attachments(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """List all attachments for a contact."""
    svc = AttachmentService(db)
    attachments = await svc.list_by_contact(contact_id)
    return [
        {
            "id": str(a.id),
            "original_name": a.original_name,
            "mime_type": a.mime_type,
            "file_size": a.file_size,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "url": f"/api/attachments/{a.id}/download",
        }
        for a in attachments
    ]


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Delete an attachment."""
    svc = AttachmentService(db)
    deleted = await svc.delete(attachment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return {"message": "Attachment deleted"}
