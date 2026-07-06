from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.contact import Contact
from app.models.email_message import EmailMessage
from app.models.activity import Activity


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def global_search(self, q: str, limit: int = 5) -> dict:
        """Search across contacts, emails, and activities."""
        pattern = f"%{q}%"

        # ── Contacts ──
        contact_query = select(Contact).where(
            Contact.name.ilike(pattern)
            | Contact.company.ilike(pattern)
            | Contact.email.ilike(pattern)
            | Contact.title.ilike(pattern)
            | Contact.notes.ilike(pattern)
        ).limit(limit)
        contact_rows = (await self.db.execute(contact_query)).scalars().all()

        contacts = []
        for c in contact_rows:
            match_field = ""
            if q.lower() in (c.name or "").lower():
                match_field = "name"
            elif q.lower() in (c.company or "").lower():
                match_field = "company"
            elif q.lower() in (c.email or "").lower():
                match_field = "email"
            contacts.append({
                "id": str(c.id),
                "name": c.name,
                "company": c.company,
                "email": c.email,
                "title": c.title,
                "tags": c.tags or [],
                "match_field": match_field,
            })

        # ── Emails ──
        email_query = select(EmailMessage).where(
            EmailMessage.subject.ilike(pattern)
            | EmailMessage.body_text.ilike(pattern)
            | EmailMessage.from_addr.ilike(pattern)
        ).order_by(EmailMessage.sent_at.desc()).limit(limit)
        email_rows = (await self.db.execute(email_query)).scalars().all()

        emails = []
        for e in email_rows:
            snippet = (e.body_text or "")[:200]
            emails.append({
                "id": str(e.id),
                "subject": e.subject or "",
                "from_addr": e.from_addr,
                "to_addrs": e.to_addrs,
                "snippet": snippet,
                "sent_at": e.sent_at,
            })

        # ── Activities ──
        activity_query = (
            select(Activity)
            .options(joinedload(Activity.contact))
            .where(Activity.description.ilike(pattern) | Activity.outcome.ilike(pattern))
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        activity_rows = (await self.db.execute(activity_query)).scalars().all()

        activities = []
        for a in activity_rows:
            activities.append({
                "id": str(a.id),
                "type": a.type,
                "description": a.description,
                "contact_name": a.contact.name if a.contact else None,
                "created_at": a.created_at,
            })

        total = len(contacts) + len(emails) + len(activities)
        return {
            "contacts": contacts,
            "emails": emails,
            "activities": activities,
            "total": total,
        }
