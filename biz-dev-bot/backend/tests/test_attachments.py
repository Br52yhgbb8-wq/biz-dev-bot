"""Tests for the Attachment upload/download/list/delete endpoints."""

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_attachment(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Attachment Test"}, headers=auth_headers)
    cid = c.json()["id"]

    # Upload a text file
    resp = await client.post(
        f"/api/attachments/upload?contact_id={cid}",
        files={"file": ("test.txt", b"Hello, World!", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["original_name"] == "test.txt"
    assert data["mime_type"] == "text/plain"
    assert data["file_size"] == 13
    assert "id" in data
    assert "url" in data


@pytest.mark.asyncio
async def test_upload_attachment_no_file(client: AsyncClient, auth_headers: dict):
    """Upload without a file should fail."""
    resp = await client.post(
        "/api/attachments/upload",
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_download_attachment(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Download Test"}, headers=auth_headers)
    cid = c.json()["id"]

    upload = await client.post(
        f"/api/attachments/upload?contact_id={cid}",
        files={"file": ("download.txt", b"Download content", "text/plain")},
        headers=auth_headers,
    )
    aid = upload.json()["id"]

    resp = await client.get(f"/api/attachments/{aid}/download", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.content == b"Download content"
    assert resp.headers["content-type"].startswith("text/plain")


@pytest.mark.asyncio
async def test_download_attachment_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"/api/attachments/{uuid.uuid4()}/download", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_contact_attachments(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "List Test"}, headers=auth_headers)
    cid = c.json()["id"]

    # Upload two files
    await client.post(
        f"/api/attachments/upload?contact_id={cid}",
        files={"file": ("a.txt", b"File A", "text/plain")},
        headers=auth_headers,
    )
    await client.post(
        f"/api/attachments/upload?contact_id={cid}",
        files={"file": ("b.txt", b"File B", "text/plain")},
        headers=auth_headers,
    )

    resp = await client.get(f"/api/attachments/by-contact/{cid}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    names = [d["original_name"] for d in data]
    assert "a.txt" in names
    assert "b.txt" in names


@pytest.mark.asyncio
async def test_delete_attachment(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Delete Test"}, headers=auth_headers)
    cid = c.json()["id"]

    upload = await client.post(
        f"/api/attachments/upload?contact_id={cid}",
        files={"file": ("delete.txt", b"Delete me", "text/plain")},
        headers=auth_headers,
    )
    aid = upload.json()["id"]

    resp = await client.delete(f"/api/attachments/{aid}", headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_attachment_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.delete(f"/api/attachments/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_rejects_invalid_extension(client: AsyncClient, auth_headers: dict):
    c = await client.post("/api/contacts", json={"name": "Ext Test"}, headers=auth_headers)
    cid = c.json()["id"]

    # .exe is not in the allowed list
    resp = await client.post(
        f"/api/attachments/upload?contact_id={cid}",
        files={"file": ("malware.exe", b"fake", "application/x-msdownload")},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_attachments_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/attachments/upload",
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert resp.status_code == 403
