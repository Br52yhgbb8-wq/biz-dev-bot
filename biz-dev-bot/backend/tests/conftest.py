"""Test fixtures for the Biz Dev Bot backend.

SQLite compatibility for PostgreSQL types (UUID, JSONB) is registered
automatically by app.database when a SQLite URL is detected, so no
separate @compiles handlers are needed here.
"""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop them after.

    Each test gets a clean database state. The SQLite compile handlers in
    app.database allow PostgreSQL-specific types (UUID, JSONB) to work
    with SQLite.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator:
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient) -> str:
    """Register a test user and return the access token.

    Re-registers for each test because the database tables are
    recreated per test via setup_db.
    """
    resp = await client.post("/api/auth/register", json={"username": "test", "password": "test"})
    if resp.status_code == 400:
        # Already registered (shouldn't happen with per-test cleanup, but handle gracefully)
        resp = await client.post("/api/auth/login", json={"username": "test", "password": "test"})
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(auth_token: str) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}
