# Biz Dev Bot -- Phase 4: LinkedIn Playwright Automation

**Goal:** LinkedIn automation for lead research: search, profile extraction, batch CRM import.

**Tech Stack:** Playwright (async), FastAPI thread pool for browser ops

---

## Task 1: LinkedIn Service (Backend)
- Add playwright to requirements.txt
- Create `app/services/linkedin.py`: Browser management, search, profile extraction
- Create `app/schemas/linkedin.py`: LinkedIn search/import schemas
- Create `app/routers/linkedin.py`: LinkedIn API endpoints
- Register in main.py

## Task 2: LinkedIn Frontend Page
- Create `app/linkedin/page.tsx`: LinkedIn search + results + import UI
- Update sidebar navigation (AppLayout.tsx)
