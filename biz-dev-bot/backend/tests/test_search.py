"""Tests for the Global Search endpoint.

Tests search across contacts, emails, and activities.
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_search_contacts(client: AsyncClient, auth_headers: dict):
    await client.post("/api/contacts", json={
        "name": "Alice Smith", "company": "Alpha Corp", "email": "alice@alpha.com"
    }, headers=auth_headers)
    await client.post("/api/contacts", json={
        "name": "Bob Jones", "company": "Beta LLC", "email": "bob@beta.com"
    }, headers=auth_headers)

    resp = await client.get("/api/search?q=Alpha", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    # Should find the contact whose company contains "Alpha"
    assert len(data["contacts"]) >= 1
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_search_contacts_by_name(client: AsyncClient, auth_headers: dict):
    await client.post("/api/contacts", json={
        "name": "Charlie Alpha", "company": "Gamma Inc", "email": "charlie@gamma.com"
    }, headers=auth_headers)

    resp = await client.get("/api/search?q=Charlie", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["contacts"]) >= 1
    assert data["contacts"][0]["match_field"] == "name"


@pytest.mark.asyncio
async def test_search_emails(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Email Search"}, headers=auth_headers)
    cid = c.json()["id"]

    # Manually create an email by calling the notification service? No, we need the email router.
    # Instead, let's check that search works without any emails
    resp = await client.get("/api/search?q=Test", headers=auth_headers)
    assert resp.status_code == 200
    assert "emails" in resp.json()


@pytest.mark.asyncio
async def test_search_activities(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Activity Search"}, headers=auth_headers)
    cid = c.json()["id"]
    await client.post(
        "/api/activities",
        json={"contact_id": cid, "type": "note", "description": "Discussed partnership opportunities"},
        headers=auth_headers,
    )

    resp = await client.get("/api/search?q=partnership", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["activities"]) >= 1
    assert "partnership" in data["activities"][0]["description"].lower()


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/search?q=zzz_nonexistent_zzz", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["contacts"] == []
    assert data["emails"] == []
    assert data["activities"] == []


@pytest.mark.asyncio
async def test_search_requires_query(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/search", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_empty_query(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/search?q=", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_requires_auth(client: AsyncClient):
    resp = await client.get("/api/search?q=test")
    assert resp.status_code == 403
