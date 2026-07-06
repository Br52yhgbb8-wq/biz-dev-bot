"""Tests for the Scheduler (follow-up reminders, job list, cancel) endpoints."""

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_schedule_follow_up(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Follow-up Test"}, headers=auth_headers)
    cid = c.json()["id"]
    p = await client.post("/api/pipelines", json={"contact_id": cid}, headers=auth_headers)
    pid = p.json()["id"]

    from datetime import datetime, timezone, timedelta
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    resp = await client.post(
        "/api/scheduler/follow-ups",
        json={
            "pipeline_id": pid,
            "contact_id": cid,
            "scheduled_at": future,
            "message": "Reminder: follow up with client",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data
    assert "message" in data


@pytest.mark.asyncio
async def test_list_scheduler_jobs(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/scheduler/jobs", headers=auth_headers)
    assert resp.status_code == 200
    # Jobs list is fine even when empty
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_cancel_job_not_found(client: AsyncClient, auth_headers: dict):
    """Cancelling a non-existent job should return 404."""
    resp = await client.delete("/api/scheduler/jobs/nonexistent-job-id", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_scheduler_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/scheduler/follow-ups",
        json={
            "pipeline_id": str(uuid.uuid4()),
            "contact_id": str(uuid.uuid4()),
            "scheduled_at": "2026-07-01T00:00:00Z",
        },
    )
    assert resp.status_code == 403
    resp = await client.get("/api/scheduler/jobs")
    assert resp.status_code == 403
