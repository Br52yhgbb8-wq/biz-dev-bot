from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Biz Dev Bot"
    DEBUG: bool = True

    # Production: PostgreSQL via asyncpg
    DATABASE_URL: str = "postgresql+asyncpg://bizdev:bizdev@localhost:5432/bizdev"

    # Local dev: SQLite (no Docker needed) — override DATABASE_URL when DEV_MODE=True
    DEV_MODE: bool = True
    DEV_DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    TEST_DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"


def get_database_url() -> str:
    """Return the correct database URL based on DEV_MODE.

    In development mode (default), use SQLite so the app can run
    without Docker / PostgreSQL. Set DEV_MODE=false and configure
    DATABASE_URL for production.
    """
    if settings.DEV_MODE:
        return settings.DEV_DATABASE_URL
    return settings.DATABASE_URL


settings = Settings()
# Override DATABASE_URL at module level so database.py picks up the right URL
if settings.DEV_MODE:
    settings.DATABASE_URL = settings.DEV_DATABASE_URL
