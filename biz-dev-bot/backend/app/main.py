from contextlib import asynccontextmanager
from sqlalchemy import text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.logging_config import configure_logging
from prometheus_fastapi_instrumentator import Instrumentator
from app.routers import (
    auth,
    contacts,
    pipelines,
    email,
    linkedin,
    dashboard,
    activities,
    email_templates,
    search,
    attachments,
    notifications,
)
from app.routers.llm import router as llm_router
from app.routers.leads import router as leads_router
from app.routers.uniepu import router as uniepu_router
from app.routers.scheduler import router as scheduler_router
from app.rate_limiter.task_queue import ensure_task_queue_running, shutdown_task_queue


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database (dev mode) and start background scheduler."""
    configure_logging(level="DEBUG" if settings.DEBUG else "INFO")
    # Initialize Sentry
    if settings.SENTRY_DSN:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment="production" if not settings.DEV_MODE else "development",
            traces_sample_rate=0.1,
        )
    from app.database import init_db
    if settings.DEV_MODE:
        await init_db()
    from app.services.scheduler import start_scheduler, stop_scheduler
    await ensure_task_queue_running()
    await start_scheduler()
    yield
    await shutdown_task_queue()
    await stop_scheduler()


# Conditional docs: disable in production
docs_kwargs = {}
if settings.DISABLE_DOCS:
    docs_kwargs["docs_url"] = None
    docs_kwargs["redoc_url"] = None

app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan, **docs_kwargs)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.HERMES_ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(pipelines.router)
app.include_router(email.router)
app.include_router(linkedin.router)
app.include_router(dashboard.router)
app.include_router(activities.router)
app.include_router(email_templates.router)
app.include_router(scheduler_router)
app.include_router(search.router)
app.include_router(attachments.router)
app.include_router(notifications.router)
app.include_router(llm_router)
app.include_router(leads_router)
app.include_router(uniepu_router)


# Prometheus metrics (exposed at /metrics)
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health")
async def health():
    """Health check with dependency verification."""
    from app.database import engine
    from app.services.gmail import GmailService
    from app.services.linkedin import linkedin_browser

    checks = {}
    healthy = True

    # Database check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        healthy = False

    # Gmail check
    try:
        gmail = GmailService()
        checks["gmail_credentials"] = "present" if gmail.credentials_exist else "missing"
        checks["gmail_authenticated"] = "yes" if gmail.is_authenticated else "no"
    except Exception as e:
        checks["gmail"] = f"error: {e}"

    # LinkedIn check
    checks["linkedin_browser"] = "running" if linkedin_browser.is_running else "stopped"

    return {"status": "ok" if healthy else "degraded", "checks": checks, "version": "0.1.0"}
