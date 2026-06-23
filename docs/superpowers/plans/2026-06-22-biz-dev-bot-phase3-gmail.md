# Biz Dev Bot -- Phase 3: Gmail Integration

**Goal:** Integrate Gmail API for sending/receiving emails, with OAuth authentication, inbox sync, and email-contact linking.

**Tech Stack:** Google API Python Client, google-auth-oauthlib, APScheduler (for periodic sync)

---

## Task 1: Gmail Service (Backend)
- Add Gmail API dependencies to requirements.txt
- Create `app/services/gmail.py`: OAuth flow, send, list threads, sync
- Create `app/schemas/email.py`: Email schemas (thread, message, send)
- Create `app/routers/email.py`: Email API endpoints
- Register router in main.py

## Task 2: Settings Page + Email Frontend
- Create `app/settings/page.tsx`: Gmail OAuth config, connection status
- Create `app/email/page.tsx`: Inbox view (thread list)
- Create `app/email/compose/page.tsx`: Compose/send email
