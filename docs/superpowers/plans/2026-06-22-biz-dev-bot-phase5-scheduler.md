# Biz Dev Bot -- Phase 5: Scheduling + Campaign Management

**Goal:** Background scheduling (APScheduler), follow-up reminders, batch campaign execution.

---

## Task 1: Scheduler + Campaign Backend
- Add apscheduler to requirements.txt
- Create `app/services/scheduler.py` — APScheduler integration
- Create `app/services/campaign.py` — Campaign execution engine
- Create `app/schemas/campaign.py` — Campaign/activity schemas
- Create `app/routers/scheduler.py` — Scheduler + Campaign API
- Update main.py with scheduler lifespan

## Task 2: Campaign Frontend
- Create `app/campaigns/page.tsx` — Campaign list + create + detail
- Update sidebar navigation
