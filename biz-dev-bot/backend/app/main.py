from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    auth,
    contacts,
    pipelines,
    email,
    linkedin,
    dashboard,
    activities,
)
from app.routers.scheduler import router as scheduler_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database (dev mode) and start background scheduler."""
    from app.database import init_db
    if settings.DEV_MODE:
        await init_db()
    from app.services.scheduler import start_scheduler, stop_scheduler
    await start_scheduler()
    yield
    await stop_scheduler()


app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
app.include_router(scheduler_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
