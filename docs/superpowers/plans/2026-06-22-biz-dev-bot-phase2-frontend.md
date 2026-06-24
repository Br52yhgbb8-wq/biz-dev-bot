# Biz Dev Bot -- Phase 2: Frontend Skeleton Implementation Plan

**Goal:** Build the Next.js frontend with login, contacts CRUD, and pipeline Kanban board.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide icons

**API Backend:** http://localhost:8000 (FastAPI)

---

## File Structure

```
biz-dev-bot/frontend/
+-- package.json
+-- tailwind.config.ts
+-- app/
|   +-- layout.tsx          (root layout + AuthProvider)
|   +-- page.tsx            (redirect to /dashboard)
|   +-- login/page.tsx      (login/register page)
|   +-- dashboard/page.tsx  (Pipeline overview + stats)
|   +-- contacts/page.tsx   (contacts list with search)
|   +-- contacts/[id]/page.tsx (contact detail)
|   +-- pipelines/page.tsx  (Pipeline Kanban)
+-- components/
|   +-- ui/                 (shadcn components)
|   +-- contacts-table.tsx
|   +-- pipeline-kanban.tsx
|   +-- auth-provider.tsx
+-- lib/
    +-- api.ts              (API client)
    +-- auth.ts             (token management)
```

## Tasks

### Task 1: Next.js Scaffold + shadcn/ui
- Create Next.js project with TypeScript + Tailwind
- Add shadcn/ui (button, card, input, table, dialog, badge)
- Add Lucide icons
- Set up basic layout

### Task 2: Auth (Login Page + AuthProvider)
- API client wrapper (login/register calls)
- AuthProvider context (token storage, user state)
- Login page with email/password form
- Route protection (redirect to /login if no token)

### Task 3: Contacts List + Detail Pages
- Contacts list page: table with name, company, title, email, tags
- Search/filter bar
- Contact detail page with info + pipeline timeline
- Create contact dialog

### Task 4: Pipeline Kanban
- Pipeline list page with stage columns
- Kanban cards showing deal info
- Stage advancement (update stage)
- Create pipeline dialog

### Task 5: Dashboard
- Pipeline overview (stages count + total value)
- Recent contacts
- Quick actions
