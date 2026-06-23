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
