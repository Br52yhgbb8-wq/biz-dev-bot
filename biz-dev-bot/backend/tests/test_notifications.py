"""Tests for the Notification endpoints.

Notifications are created via the test database session, then verified
via the API router endpoints.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# Import the test session factory from conftest
from tests.conftest import TestSessionLocal
from app.services.notification import NotificationService


@pytest.mark.asyncio
async def _seed_notifications(username: str = "test", count: int = 2):
    """Create notifications directly in the test database."""
    async with TestSessionLocal() as db:
        svc = NotificationService(db)
        for i in range(count):
            await svc.create(
                title=f"Notification {i+1}",
                message=f"Test message {i+1}",
                notification_type="info",
                username=username,
            )


@pytest.mark.asyncio
async def test_list_notifications(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/notifications", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_list_notifications_with_data(client: AsyncClient, auth_headers: dict):
    await _seed_notifications("test", 3)
    resp = await client.get("/api/notifications", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3


@pytest.mark.asyncio
async def test_unread_count(client: AsyncClient, auth_headers: dict):
    await _seed_notifications("test", 2)
    resp = await client.get("/api/notifications/unread-count", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["count"] == 2


@pytest.mark.asyncio
async def test_mark_read(client: AsyncClient, auth_headers: dict):
    await _seed_notifications("test", 1)
    resp = await client.get("/api/notifications?limit=1", headers=auth_headers)
    nid = resp.json()["items"][0]["id"]

    resp = await client.post(f"/api/notifications/{nid}/read", headers=auth_headers)
    assert resp.status_code == 200

    # Unread count should be 0 now
    resp = await client.get("/api/notifications/unread-count", headers=auth_headers)
    assert resp.json()["count"] == 0


@pytest.mark.asyncio
async def test_mark_read_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.post(f"/api/notifications/{uuid.uuid4()}/read", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_mark_all_read(client: AsyncClient, auth_headers: dict):
    await _seed_notifications("test", 3)
    resp = await client.post("/api/notifications/mark-all-read", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["count"] == 3

    resp = await client.get("/api/notifications/unread-count", headers=auth_headers)
    assert resp.json()["count"] == 0


@pytest.mark.asyncio
async def test_list_unread_only(client: AsyncClient, auth_headers: dict):
    await _seed_notifications("test", 2)
    # Mark one as read
    resp = await client.get("/api/notifications?limit=1", headers=auth_headers)
    nid = resp.json()["items"][0]["id"]
    await client.post(f"/api/notifications/{nid}/read", headers=auth_headers)

    resp = await client.get("/api/notifications?unread_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    for item in data["items"]:
        assert item["is_read"] is False


@pytest.mark.asyncio
async def test_notifications_requires_auth(client: AsyncClient):
    resp = await client.get("/api/notifications")
    assert resp.status_code == 403
    resp = await client.get("/api/notifications/unread-count")
    assert resp.status_code == 403
