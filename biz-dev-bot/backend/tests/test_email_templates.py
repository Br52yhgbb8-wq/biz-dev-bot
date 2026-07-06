"""Tests for Email Template CRUD and render endpoints."""

import uuid

import pytest
from httpx import AsyncClient


TEMPLATE_PAYLOAD = {
    "name": "Welcome Email",
    "subject": "Welcome {{name}}!",
    "body_text": "Hi {{name}}, welcome to {{company}}!",
    "body_html": "<p>Hi {{name}}, welcome to {{company}}!</p>",
}


@pytest.mark.asyncio
async def test_create_template(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Welcome Email"
    assert data["subject"] == "Welcome {{name}}!"
    assert data["body_text"] == "Hi {{name}}, welcome to {{company}}!"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient, auth_headers: dict):
    await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    resp = await client.get("/api/email-templates", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_template(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    tid = create.json()["id"]
    resp = await client.get(f"/api/email-templates/{tid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Welcome Email"


@pytest.mark.asyncio
async def test_get_template_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"/api/email-templates/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_template(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    tid = create.json()["id"]
    resp = await client.put(f"/api/email-templates/{tid}", json={"name": "Updated"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_template(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    tid = create.json()["id"]
    resp = await client.delete(f"/api/email-templates/{tid}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.get(f"/api/email-templates/{tid}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_render_template(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    tid = create.json()["id"]
    resp = await client.post(
        "/api/email-templates/render",
        json={"template_id": tid, "variables": {"name": "Alice", "company": "Acme"}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["subject"] == "Welcome Alice!"
    assert data["body_text"] == "Hi Alice, welcome to Acme!"
    assert data["body_html"] == "<p>Hi {{name}}, welcome to {{company}}!</p>"  # body_html returned as-is


@pytest.mark.asyncio
async def test_render_template_empty_vars(client: AsyncClient, auth_headers: dict):
    create = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD, headers=auth_headers)
    tid = create.json()["id"]
    resp = await client.post(
        "/api/email-templates/render",
        json={"template_id": tid, "variables": {}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "{{name}}" in resp.json()["subject"]


@pytest.mark.asyncio
async def test_render_template_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/email-templates/render",
        json={"template_id": str(uuid.uuid4()), "variables": {}},
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_templates_requires_auth(client: AsyncClient):
    resp = await client.post("/api/email-templates", json=TEMPLATE_PAYLOAD)
    assert resp.status_code == 403
