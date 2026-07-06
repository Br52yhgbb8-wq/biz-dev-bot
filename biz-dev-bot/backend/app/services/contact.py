import uuid
from typing import List, Optional
import csv
import io
import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ContactCreate) -> Contact:
        contact = Contact(**data.model_dump())
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def get(self, contact_id: uuid.UUID) -> Optional[Contact]:
        result = await self.db.execute(select(Contact).where(Contact.id == contact_id))
        return result.scalar_one_or_none()

    async def list(
        self, search: Optional[str] = None, tag: Optional[str] = None,
        source: Optional[str] = None, skip: int = 0, limit: int = 50,
    ) -> tuple[list[Contact], int]:
        query = select(Contact)
        count_query = select(func.count(Contact.id))

        if search:
            pattern = f"%{search}%"
            query = query.where(
                Contact.name.ilike(pattern)
                | Contact.company.ilike(pattern)
                | Contact.email.ilike(pattern)
            )
            count_query = count_query.where(
                Contact.name.ilike(pattern)
                | Contact.company.ilike(pattern)
                | Contact.email.ilike(pattern)
            )
        if tag:
            query = query.where(Contact.tags.contains([tag]))
            count_query = count_query.where(Contact.tags.contains([tag]))
        if source:
            query = query.where(Contact.source == source)
            count_query = count_query.where(Contact.source == source)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        result = await self.db.execute(
            query.order_by(Contact.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def update(self, contact_id: uuid.UUID, data: ContactUpdate) -> Optional[Contact]:
        contact = await self.get(contact_id)
        if not contact:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def delete(self, contact_id: uuid.UUID) -> bool:
        contact = await self.get(contact_id)
        if not contact:
            return False
        await self.db.delete(contact)
        await self.db.commit()
        return True

    async def import_csv(self, csv_content: str, delimiter: str = ",") -> dict:
        """Import contacts from a CSV string.

        Expected columns (header row): name, company, title, email, phone,
        source, tags, notes. Only 'name' is required.

        Returns: {'imported': N, 'skipped': N, 'errors': [str]}
        """
        reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)
        imported = 0
        skipped = 0
        errors = []

        for row_num, row in enumerate(reader, start=2):
            name = (row.get("name") or "").strip()
            if not name:
                skipped += 1
                errors.append(f"Row {row_num}: missing name, skipped")
                continue

            tags = row.get("tags", "")
            tags_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

            contact = Contact(
                name=name,
                company=(row.get("company") or "").strip() or None,
                title=(row.get("title") or "").strip() or None,
                email=(row.get("email") or "").strip() or None,
                phone=(row.get("phone") or "").strip() or None,
                source=(row.get("source") or "").strip() or "import",
                tags=tags_list,
                notes=(row.get("notes") or "").strip() or None,
            )
            self.db.add(contact)
            imported += 1

        await self.db.commit()
        return {"imported": imported, "skipped": skipped, "errors": errors}

    async def export_csv(self) -> str:
        """Export all contacts as a CSV string."""
        result = await self.db.execute(select(Contact).order_by(Contact.created_at.desc()))
        contacts = result.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name", "company", "title", "email", "phone", "source", "tags", "notes", "created_at"])

        for c in contacts:
            writer.writerow([
                c.name,
                c.company or "",
                c.title or "",
                c.email or "",
                c.phone or "",
                c.source,
                ", ".join(c.tags or []),
                c.notes or "",
                c.created_at.isoformat() if c.created_at else "",
            ])

        return output.getvalue()
    async def batch_tag(self, contact_ids: List[uuid.UUID], tags: List[str], action: str = "add") -> dict:
        """Add or remove tags to multiple contacts at once."""
        count = 0
        for cid in contact_ids:
            contact = await self.get(cid)
            if not contact:
                continue
            current_tags = contact.tags or []
            if action == "add":
                new_tags = list(set(current_tags + tags))
            else:
                new_tags = [t for t in current_tags if t not in tags]
            contact.tags = new_tags
            count += 1
        await self.db.commit()
        return {"success": True, "count": count, "message": f"Updated tags for {count} contact(s)"}

    async def batch_delete(self, contact_ids: List[uuid.UUID]) -> dict:
        """Delete multiple contacts at once."""
        count = 0
        for cid in contact_ids:
            contact = await self.get(cid)
            if not contact:
                continue
            await self.db.delete(contact)
            count += 1
        await self.db.commit()
        return {"success": True, "count": count, "message": f"Deleted {count} contact(s)"}

    async def batch_export_selected(self, contact_ids: List[uuid.UUID]) -> str:
        """Export selected contacts as CSV string."""
        contacts = []
        for cid in contact_ids:
            contact = await self.get(cid)
            if contact:
                contacts.append(contact)

        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name", "company", "title", "email", "phone", "source", "tags", "notes", "created_at"])
        for c in contacts:
            writer.writerow([
                c.name, c.company or "", c.title or "", c.email or "",
                c.phone or "", c.source, ", ".join(c.tags or []),
                c.notes or "", c.created_at.isoformat() if c.created_at else "",
            ])
        return output.getvalue()
