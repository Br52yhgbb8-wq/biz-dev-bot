"""Tests for the Dashboard API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_pipeline_overview_empty(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/dashboard/pipeline-overview", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_deals"] == 0
    assert data["total_value"] == 0.0
    assert data["win_rate"] == 0.0
    assert data["stages"] == []


@pytest.mark.asyncio
async def test_pipeline_overview_with_data(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Client A"}, headers=auth_headers)
    cid = c.json()["id"]
    await client.post("/api/pipelines", json={"contact_id": cid, "deal_value": "100000", "stage": "proposal"}, headers=auth_headers)

    c2 = await client.post("/api/contacts", json={"name": "Client B"}, headers=auth_headers)
    cid2 = c2.json()["id"]
    await client.post("/api/pipelines", json={"contact_id": cid2, "deal_value": "50000", "stage": "closed_won"}, headers=auth_headers)

    c3 = await client.post("/api/contacts", json={"name": "Client C"}, headers=auth_headers)
    cid3 = c3.json()["id"]
    await client.post("/api/pipelines", json={"contact_id": cid3, "deal_value": "20000", "stage": "closed_lost"}, headers=auth_headers)

    resp = await client.get("/api/dashboard/pipeline-overview", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_deals"] == 3
    assert data["total_value"] > 0
    # win_rate = 1 won / 2 closed = 50%
    assert data["win_rate"] == 50.0
    assert len(data["stages"]) == 3


@pytest.mark.asyncio
async def test_activity_trend(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/dashboard/activity-trend?days=7", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "trend" in data
    assert "total" in data
    assert len(data["trend"]) == 7


@pytest.mark.asyncio
async def test_campaign_stats(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/dashboard/campaign-stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "running" in data
    assert "completed" in data
    assert "draft" in data
    assert "total_sent" in data
    assert data["total"] == 0  # no campaigns yet


@pytest.mark.asyncio
async def test_campaign_stats_with_data(client: AsyncClient, auth_headers: dict):
    await client.post("/api/campaigns", json={"name": "Test Campaign"}, headers=auth_headers)
    resp = await client.get("/api/dashboard/campaign-stats", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_full_dashboard(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/dashboard/full?days=7", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "pipeline" in data
    assert "activity_trend" in data
    assert "campaign" in data
    assert len(data["activity_trend"]["trend"]) == 7


@pytest.mark.asyncio
async def test_dashboard_edge_case_days(client: AsyncClient, auth_headers: dict):
    """Min and max allowed days for activity-trend."""
    resp = await client.get("/api/dashboard/activity-trend?days=7", headers=auth_headers)
    assert resp.status_code == 200
    resp = await client.get("/api/dashboard/activity-trend?days=365", headers=auth_headers)
    assert resp.status_code == 200
    # Below minimum
    resp = await client.get("/api/dashboard/activity-trend?days=1", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_dashboard_requires_auth(client: AsyncClient):
    resp = await client.get("/api/dashboard/pipeline-overview")
    assert resp.status_code == 403
    resp = await client.get("/api/dashboard/activity-trend")
    assert resp.status_code == 403
    resp = await client.get("/api/dashboard/campaign-stats")
    assert resp.status_code == 403
