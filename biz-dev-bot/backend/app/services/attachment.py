"""Attachment service with file validation and size limits."""

import os
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.attachment import Attachment

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads")

# Allowed MIME type prefixes — matches common document & image types
ALLOWED_MIME_PREFIXES = (
    "image/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.",
    "application/vnd.ms-",
    "text/plain",
    "text/csv",
)


class AttachmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    def _validate_file(self, file: UploadFile, content: bytes) -> None:
        """Validate file extension and size."""
        # Check extension
        if file.filename:
            ext = os.path.splitext(file.filename)[1].lower()
            if ext and ext not in settings.allowed_extensions_set:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type '{ext}' is not allowed. Allowed: {settings.ALLOWED_UPLOAD_EXTENSIONS}",
                )

        # Check mime type
        if file.content_type:
            if not any(file.content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File MIME type '{file.content_type}' is not allowed.",
                )

        # Check size
        if len(content) > settings.max_upload_bytes:
            max_mb = settings.MAX_UPLOAD_SIZE_MB
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {max_mb} MB.",
            )

    async def upload(
        self,
        file: UploadFile,
        contact_id: Optional[uuid.UUID] = None,
        email_message_id: Optional[uuid.UUID] = None,
        uploaded_by: Optional[str] = None,
    ) -> Attachment:
        """Save an uploaded file and create a DB record."""
        content = await file.read()

        # Validate before writing
        self._validate_file(file, content)

        file_id = uuid.uuid4()
        ext = ""
        if file.filename and "." in file.filename:
            ext = file.filename.rsplit(".", 1)[1]
        storage_name = f"{file_id}.{ext}" if ext else str(file_id)
        storage_path = os.path.join(UPLOAD_DIR, storage_name)

        with open(storage_path, "wb") as f:
            f.write(content)

        attachment = Attachment(
            filename=storage_name,
            original_name=file.filename or storage_name,
            mime_type=file.content_type or "application/octet-stream",
            file_size=len(content),
            storage_path=storage_path,
            contact_id=contact_id,
            email_message_id=email_message_id,
            uploaded_by=uploaded_by,
        )
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def list_by_contact(self, contact_id: uuid.UUID) -> list[Attachment]:
        result = await self.db.execute(
            select(Attachment)
            .where(Attachment.contact_id == contact_id)
            .order_by(Attachment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, attachment_id: uuid.UUID) -> Optional[Attachment]:
        result = await self.db.execute(
            select(Attachment).where(Attachment.id == attachment_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, attachment_id: uuid.UUID) -> bool:
        attachment = await self.get(attachment_id)
        if not attachment:
            return False
        if os.path.exists(attachment.storage_path):
            os.remove(attachment.storage_path)
        await self.db.delete(attachment)
        await self.db.commit()
        return True
