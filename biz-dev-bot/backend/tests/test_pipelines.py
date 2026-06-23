import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_pipeline(client: AsyncClient, auth_headers: dict):
    c_resp = await client.post("/api/contacts", json={"name": "Client"}, headers=auth_headers)
    cid = c_resp.json()["id"]
    payload = {"contact_id": cid, "deal_value": "50000", "probability": 50}
    resp = await client.post("/api/pipelines", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["stage"] == "discovery"
    assert data["deal_value"] == "50000.00"
    assert data["probability"] == 50


@pytest.mark.asyncio
async def test_update_stage(client: AsyncClient, auth_headers: dict):
    c_resp = await client.post("/api/contacts", json={"name": "A"}, headers=auth_headers)
    cid = c_resp.json()["id"]
    p_resp = await client.post("/api/pipelines", json={"contact_id": cid}, headers=auth_headers)
    pid = p_resp.json()["id"]
    resp = await client.put(f"/api/pipelines/{pid}/stage", json={"stage": "proposal"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["stage"] == "proposal"


@pytest.mark.asyncio
async def test_list_pipelines_by_stage(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "B"}, headers=auth_headers)
    cid = c.json()["id"]
    await client.post("/api/pipelines", json={"contact_id": cid, "stage": "proposal"}, headers=auth_headers)
    await client.post("/api/pipelines", json={"contact_id": cid, "stage": "discovery"}, headers=auth_headers)
    resp = await client.get("/api/pipelines?stage=proposal", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_delete_pipeline(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "C"}, headers=auth_headers)
    cid = c.json()["id"]
    p = await client.post("/api/pipelines", json={"contact_id": cid}, headers=auth_headers)
    pid = p.json()["id"]
    resp = await client.delete(f"/api/pipelines/{pid}", headers=auth_headers)
    assert resp.status_code == 204
