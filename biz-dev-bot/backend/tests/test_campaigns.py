"""Tests for Campaign CRUD and lifecycle endpoints."""

import uuid

import pytest
from httpx import AsyncClient


CAMPAIGN_PAYLOAD = {
    "name": "Q2 Outreach",
    "sequence": [
        {"delay_days": 0, "type": "email", "subject": "Hello"},
        {"delay_days": 3, "type": "email", "subject": "Follow-up"},
    ],
}


@pytest.mark.asyncio
async def test_create_campaign(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Q2 Outreach"
    assert data["status"] == "draft"
    assert data["sequence"] == CAMPAIGN_PAYLOAD["sequence"]
    assert "id" in data


@pytest.mark.asyncio
async def test_list_campaigns(client: AsyncClient, auth_headers: dict):
    await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    resp = await client.get("/api/campaigns", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_campaign(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.get(f"/api/campaigns/{cid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Q2 Outreach"


@pytest.mark.asyncio
async def test_get_campaign_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"/api/campaigns/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_campaign(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.put(f"/api/campaigns/{cid}", json={"name": "Updated"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_campaign(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.delete(f"/api/campaigns/{cid}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_start_campaign(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.post(f"/api/campaigns/{cid}/start", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"


@pytest.mark.asyncio
async def test_pause_campaign(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    await client.post(f"/api/campaigns/{cid}/start", headers=auth_headers)
    resp = await client.post(f"/api/campaigns/{cid}/pause", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"


@pytest.mark.asyncio
async def test_resume_campaign(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    await client.post(f"/api/campaigns/{cid}/start", headers=auth_headers)
    await client.post(f"/api/campaigns/{cid}/pause", headers=auth_headers)
    resp = await client.post(f"/api/campaigns/{cid}/resume", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"


@pytest.mark.asyncio
async def test_get_campaign_stats(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.get(f"/api/campaigns/{cid}/stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "total_sent" in data
    assert data["sequence_steps"] == 2


@pytest.mark.asyncio
async def test_campaign_not_found_on_action(client: AsyncClient, auth_headers: dict):
    dummy = str(uuid.uuid4())
    resp = await client.post(f"/api/campaigns/{dummy}/start", headers=auth_headers)
    assert resp.status_code == 404
    resp = await client.post(f"/api/campaigns/{dummy}/pause", headers=auth_headers)
    assert resp.status_code == 404
    resp = await client.get(f"/api/campaigns/{dummy}/stats", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_campaigns_requires_auth(client: AsyncClient):
    resp = await client.post("/api/campaigns", json=CAMPAIGN_PAYLOAD)
    assert resp.status_code == 403
