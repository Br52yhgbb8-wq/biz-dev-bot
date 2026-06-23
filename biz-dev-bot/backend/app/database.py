"""Database engine and session management.

Supports both PostgreSQL (production) and SQLite (development / tests).
SQLite compatibility for PostgreSQL types (UUID, JSONB) is registered at import time
when the database URL points to a SQLite backend.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PgUUID, JSONB as PgJSONB

from app.config import settings
from app.models.base import Base


# ── SQLite compatibility handlers ──────────────────────────────────────
# These are registered when the engine URL contains 'sqlite', allowing
# models that use PostgreSQL-specific types (UUID, JSONB) to work with
# a local SQLite database for development and testing.

def _register_sqlite_compiles():
    @compiles(PgUUID, "sqlite")
    def _compile_pg_uuid_sqlite(type_, compiler, **kw):
        return "TEXT"

    @compiles(PgJSONB, "sqlite")
    def _compile_pg_jsonb_sqlite(type_, compiler, **kw):
        return "TEXT"


# ── Engine setup ──────────────────────────────────────────────────────

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    _register_sqlite_compiles()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)
async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db():
    """Create all database tables.

    Intended for local development with SQLite. In production, use Alembic
    migrations (see alembic/).
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency that provides an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
