"""Tests for Contact CRUD, batch operations, CSV import/export, and filters."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_contact(client: AsyncClient, auth_headers: dict):
    payload = {"name": "John Doe", "company": "Acme Inc", "email": "john@acme.com"}
    resp = await client.post("/api/contacts", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "John Doe"
    assert data["company"] == "Acme Inc"
    assert data["email"] == "john@acme.com"
    assert data["source"] == "manual"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_contacts(client: AsyncClient, auth_headers: dict):
    await client.post("/api/contacts", json={"name": "Alice"}, headers=auth_headers)
    await client.post("/api/contacts", json={"name": "Bob"}, headers=auth_headers)
    resp = await client.get("/api/contacts", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_search_contacts(client: AsyncClient, auth_headers: dict):
    await client.post("/api/contacts", json={"name": "Alice", "company": "Alpha"}, headers=auth_headers)
    await client.post("/api/contacts", json={"name": "Bob", "company": "Beta"}, headers=auth_headers)
    resp = await client.get("/api/contacts?search=Alpha", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_contact(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/contacts", json={"name": "Charlie"}, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.get(f"/api/contacts/{cid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Charlie"


@pytest.mark.asyncio
async def test_get_contact_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/contacts/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_contact(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/contacts", json={"name": "Old Name"}, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.put(f"/api/contacts/{cid}", json={"name": "New Name"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_contact(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/contacts", json={"name": "To Delete"}, headers=auth_headers)
    cid = create.json()["id"]
    resp = await client.delete(f"/api/contacts/{cid}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.get(f"/api/contacts/{cid}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_contact_requires_auth(client: AsyncClient):
    resp = await client.post("/api/contacts", json={"name": "No Auth"})
    assert resp.status_code == 403


# ── Batch Operations ──


@pytest.mark.asyncio
async def test_batch_tag_add(client: AsyncClient, auth_headers: dict):
    c1 = await client.post("/api/contacts", json={"name": "Tag A", "tags": []}, headers=auth_headers)
    c2 = await client.post("/api/contacts", json={"name": "Tag B", "tags": []}, headers=auth_headers)
    resp = await client.post(
        "/api/contacts/batch/tag",
        json={"contact_ids": [c1.json()["id"], c2.json()["id"]], "tags": ["vip", "hot"], "action": "add"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == 2

    g1 = await client.get(f"/api/contacts/{c1.json()['id']}", headers=auth_headers)
    assert "vip" in g1.json()["tags"]
    assert "hot" in g1.json()["tags"]


@pytest.mark.asyncio
async def test_batch_tag_remove(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Tag Remove", "tags": ["vip", "hot", "old"]}, headers=auth_headers)
    cid = c.json()["id"]
    await client.post(
        "/api/contacts/batch/tag",
        json={"contact_ids": [cid], "tags": ["old"], "action": "remove"},
        headers=auth_headers,
    )
    g = await client.get(f"/api/contacts/{cid}", headers=auth_headers)
    assert "old" not in g.json()["tags"]
    assert "vip" in g.json()["tags"]


@pytest.mark.asyncio
async def test_batch_delete(client: AsyncClient, auth_headers: dict):
    c1 = await client.post("/api/contacts", json={"name": "Del A"}, headers=auth_headers)
    c2 = await client.post("/api/contacts", json={"name": "Del B"}, headers=auth_headers)
    resp = await client.post(
        "/api/contacts/batch/delete",
        json={"contact_ids": [c1.json()["id"], c2.json()["id"]]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == 2
    resp = await client.get(f"/api/contacts/{c1.json()['id']}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_batch_tag_invalid_action(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Invalid"}, headers=auth_headers)
    cid = c.json()["id"]
    resp = await client.post(
        "/api/contacts/batch/tag",
        json={"contact_ids": [cid], "tags": ["x"], "action": "invalid"},
        headers=auth_headers,
    )
    assert resp.status_code == 200


# ── Import / Export ──


@pytest.mark.asyncio
async def test_export_csv(client: AsyncClient, auth_headers: dict):
    await client.post("/api/contacts", json={"name": "CSV Export", "company": "CSV Inc"}, headers=auth_headers)
    resp = await client.get("/api/contacts/export-csv", headers=auth_headers)
    assert resp.status_code == 200
    assert "CSV Export" in resp.text
    assert "CSV Inc" in resp.text


    csv_content = "name,company,email\nImported1,ImpCo1,i1@test.com\nImported2,ImpCo2,i2@test.com"
    resp = await client.post(
        "/api/contacts/import-csv",
        content=csv_content.encode("utf-8"),
        headers={"Authorization": auth_headers["Authorization"], "Content-Type": "text/plain"},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["imported"] == 2
    resp = await client.get("/api/contacts?search=Imported1", headers=auth_headers)
    assert resp.json()["total"] == 1
    assert resp.json()["total"] == 1


# ── Filters ──


@pytest.mark.asyncio
async def test_filter_by_source(client: AsyncClient, auth_headers: dict):
    await client.post("/api/contacts", json={"name": "Manual Contact", "source": "manual"}, headers=auth_headers)
    await client.post("/api/contacts", json={"name": "LinkedIn Contact", "source": "linkedin"}, headers=auth_headers)
    resp = await client.get("/api/contacts?source=linkedin", headers=auth_headers)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["name"] == "LinkedIn Contact"


@pytest.mark.asyncio
async def test_pagination(client: AsyncClient, auth_headers: dict):
    for i in range(5):
        await client.post("/api/contacts", json={"name": f"Page Contact {i}"}, headers=auth_headers)
    resp = await client.get("/api/contacts?limit=2", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2

    resp = await client.get("/api/contacts?skip=2&limit=2", headers=auth_headers)
    assert len(resp.json()["items"]) == 2

    resp = await client.get("/api/contacts?skip=4&limit=2", headers=auth_headers)
    assert len(resp.json()["items"]) == 1
