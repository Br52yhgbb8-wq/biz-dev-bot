from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Mercury"
    DEBUG: bool = False

    # Production: PostgreSQL via asyncpg
    DATABASE_URL: str = "postgresql+asyncpg://bizdev:bizdev@localhost:5432/bizdev"

    # Local dev: SQLite (no Docker needed) — override DATABASE_URL when DEV_MODE=True
    DEV_MODE: bool = False
    DEV_DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    TEST_DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Security: invite-only registration
    INVITE_CODE: str = ""

    # File upload restrictions
    ALLOWED_UPLOAD_EXTENSIONS: str = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.csv,.txt,.ppt,.pptx"
    MAX_UPLOAD_SIZE_MB: int = 10

    # API docs toggle — disable in production
    DISABLE_DOCS: bool = False

    # Rate limiting
    RATE_LIMIT_LOGIN: str = "5/minute"

    # Monitoring
    SENTRY_DSN: str = ""

    # ── DeepSeek LLM ─────────────────────────────────────────────
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    LLM_MAX_TOKENS: int = 4096
    LLM_CONTEXT_WINDOW: int = 32000       # deepseek-chat context limit
    LLM_MAX_CONVERSATION_HISTORY: int = 50  # max messages to keep per conversation
    LLM_DEFAULT_TEMPERATURE: float = 0.7
    LLM_ENABLED: bool = False              # set True + DEEPSEEK_API_KEY to enable

    # ── Hermes AI Agent Security ──────────────────────────────────
    HERMES_ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3007"
    # Comma-separated list of allowed origins for the Hermes chat endpoint
    # Only requests from these origins will be processed (Origin/Referer check)

    HERMES_DAILY_TOKEN_BUDGET: int = 1000000
    # Max total DeepSeek tokens per day for Hermes agent
    # DeepSeek pricing: ~$0.14/1M tokens → $1M tokens ≈ $0.14/day budget
    # Set to 0 to disable the AI entirely, -1 for unlimited

    HERMES_RATE_LIMIT_PER_IP: int = 30
    # Max requests per hour per IP for the Hermes endpoint

    # ── Gemini Lead Gen ────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    LEAD_GEN_ENABLED: bool = False
    LEAD_SCORE_THRESHOLD: int = 60          # minimum score to auto-create contacts
    LEAD_MAX_DAILY_DISCOVERY: int = 100     # cap daily discovery calls

    class Config:
        env_file = ".env"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v or v == "change-me-in-production":
            raise ValueError(
                "SECRET_KEY must be set to a strong random value. "
                "Generate one with: openssl rand -hex 32"
            )
        return v

    @property
    def allowed_extensions_set(self) -> set[str]:
        return set(ext.strip().lower() for ext in self.ALLOWED_UPLOAD_EXTENSIONS.split(",") if ext.strip())

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


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
