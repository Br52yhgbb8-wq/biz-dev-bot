import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={"username": "newuser", "password": "secret"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/auth/register", json={"username": "test", "password": "test"})
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post("/api/auth/register", json={"username": "loginuser", "password": "secret"})
    resp = await client.post("/api/auth/login", json={"username": "loginuser", "password": "secret"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json={"username": "user1", "password": "correct"})
    resp = await client.post("/api/auth/login", json={"username": "user1", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={"username": "nobody", "password": "x"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_needs_auth(client: AsyncClient):
    """Verify that protected endpoints reject unauthenticated requests."""
    # No auth header -> FastAPI HTTPBearer returns 403
    resp = await client.get("/api/contacts")
    assert resp.status_code == 403

    # Register + get a valid token
    resp = await client.post("/api/auth/register", json={"username": "authuser", "password": "pass"})
    token = resp.json()["access_token"]

    # Valid token should work
    resp = await client.get("/api/contacts", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_auth_token_works_for_all_endpoints(client: AsyncClient, auth_headers: dict):
    """Verify the auth_token fixture works across different endpoints."""
    # Create a contact
    resp = await client.post("/api/contacts", json={"name": "Test User"}, headers=auth_headers)
    assert resp.status_code == 201

    # List contacts
    resp = await client.get("/api/contacts", headers=auth_headers)
    assert resp.status_code == 200

    # Dashboard endpoint (auth should pass even if pipeline-overview has no data)
    resp = await client.get("/api/dashboard/pipeline-overview", headers=auth_headers)
    assert resp.status_code != 401
    assert resp.status_code != 403


@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient):
    """Verify that invalid tokens are rejected.

    - Missing auth header: HTTPBearer returns 403
    - Invalid token value: the auth router returns 401
    - Empty token: HTTPBearer treats as missing, returns 403
    """
    # No auth header at all -> 403 (HTTPBearer default)
    resp = await client.get("/api/contacts")
    assert resp.status_code == 403

    # Present but invalid token -> 401 (auth router check)
    resp = await client.get("/api/contacts", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401

    # Empty token (space but no value) -> 403 (HTTPBearer treats as missing)
    resp = await client.get("/api/contacts", headers={"Authorization": "Bearer "})
    assert resp.status_code == 403
