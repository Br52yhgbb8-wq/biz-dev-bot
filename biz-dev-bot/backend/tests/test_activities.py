"""Tests for the Activity CRUD and timeline endpoints."""

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_activity(client: AsyncClient, auth_headers: dict):
    """Create a contact, then an activity for it."""
    c_resp = await client.post("/api/contacts", json={"name": "Alice"}, headers=auth_headers)
    cid = c_resp.json()["id"]
    resp = await client.post(
        "/api/activities",
        json={"contact_id": cid, "type": "email", "description": "Sent intro email"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "email"
    assert data["description"] == "Sent intro email"
    assert data["contact_id"] == cid
    assert "id" in data


@pytest.mark.asyncio
async def test_list_contact_activities(client: AsyncClient, auth_headers: dict):
    c_resp = await client.post("/api/contacts", json={"name": "Bob"}, headers=auth_headers)
    cid = c_resp.json()["id"]
    await client.post("/api/activities", json={"contact_id": cid, "type": "call"}, headers=auth_headers)
    await client.post("/api/activities", json={"contact_id": cid, "type": "note"}, headers=auth_headers)

    resp = await client.get(f"/api/contacts/{cid}/activities", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_list_activities_global(client: AsyncClient, auth_headers: dict):
    c_resp = await client.post("/api/contacts", json={"name": "Charlie"}, headers=auth_headers)
    cid = c_resp.json()["id"]
    await client.post("/api/activities", json={"contact_id": cid, "type": "meeting"}, headers=auth_headers)

    resp = await client.get("/api/activities", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_activity_types(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/activities/types", headers=auth_headers)
    assert resp.status_code == 200
    types = resp.json()
    keys = [t["key"] for t in types]
    assert "email" in keys
    assert "call" in keys
    assert "meeting" in keys
    assert "note" in keys
    assert "linkedin" in keys


@pytest.mark.asyncio
async def test_update_activity(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Diana"}, headers=auth_headers)
    cid = c.json()["id"]
    a = await client.post("/api/activities", json={"contact_id": cid, "type": "note"}, headers=auth_headers)
    aid = a.json()["id"]

    resp = await client.put(f"/api/activities/{aid}", json={"description": "Updated note"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated note"


@pytest.mark.asyncio
async def test_update_activity_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.put(
        f"/api/activities/{uuid.uuid4()}", json={"description": "nope"}, headers=auth_headers
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_activity(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Eve"}, headers=auth_headers)
    cid = c.json()["id"]
    a = await client.post("/api/activities", json={"contact_id": cid, "type": "call"}, headers=auth_headers)
    aid = a.json()["id"]

    resp = await client.delete(f"/api/activities/{aid}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_activity_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.delete(f"/api/activities/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_activities_requires_auth(client: AsyncClient):
    resp = await client.post("/api/activities", json={"contact_id": str(uuid.uuid4()), "type": "note"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_activities_empty(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Frank"}, headers=auth_headers)
    cid = c.json()["id"]
    resp = await client.get(f"/api/contacts/{cid}/activities", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_activity_type_filter(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Grace"}, headers=auth_headers)
    cid = c.json()["id"]
    await client.post("/api/activities", json={"contact_id": cid, "type": "call"}, headers=auth_headers)
    await client.post("/api/activities", json={"contact_id": cid, "type": "email"}, headers=auth_headers)

    resp = await client.get(f"/api/contacts/{cid}/activities?activity_type=call", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_calendar_activities(client: AsyncClient, auth_headers: dict):
    from datetime import datetime, timezone
    c = await client.post("/api/contacts", json={"name": "Heidi"}, headers=auth_headers)
    cid = c.json()["id"]
    now = datetime.now(timezone.utc)
    await client.post(
        "/api/activities",
        json={"contact_id": cid, "type": "meeting", "completed_at": now.isoformat()},
        headers=auth_headers,
    )

    resp = await client.get(f"/api/activities/calendar?year={now.year}&month={now.month}", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
