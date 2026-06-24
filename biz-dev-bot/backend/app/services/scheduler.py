import uuid
from datetime import datetime, timezone
from typing import Optional

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.date import DateTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    AsyncIOScheduler = None
    DateTrigger = None
    IntervalTrigger = None

from app.models.scheduled_task import ScheduledTask

if APSCHEDULER_AVAILABLE:
    scheduler = AsyncIOScheduler()
else:
    scheduler = None


async def start_scheduler():
    """Start the APScheduler (called on app startup)."""
    if APSCHEDULER_AVAILABLE and scheduler and not scheduler.running:
        scheduler.start()


async def stop_scheduler():
    """Shut down the scheduler (called on app shutdown)."""
    if APSCHEDULER_AVAILABLE and scheduler and scheduler.running:
        scheduler.shutdown(wait=False)


def schedule_task(
    task_type: str,
    run_date: datetime,
    payload: dict,
    job_id: Optional[str] = None,
) -> str:
    """Schedule a one-time task with APScheduler."""
    if not APSCHEDULER_AVAILABLE:
        print(f"[Scheduler] apscheduler not installed. Task '{task_type}' not scheduled.")
        return job_id or ""
    if not job_id:
        job_id = f"{task_type}_{uuid.uuid4().hex[:8]}"

    scheduler.add_job(
        _execute_scheduled_task,
        trigger=DateTrigger(run_date=run_date),
        args=[task_type, payload],
        id=job_id,
        replace_existing=True,
    )
    return job_id


def cancel_task(job_id: str) -> bool:
    """Cancel a scheduled task by job ID."""
    if not APSCHEDULER_AVAILABLE:
        return False
    try:
        scheduler.remove_job(job_id)
        return True
    except Exception:
        return False


def get_scheduled_jobs() -> list[dict]:
    """List all currently scheduled APScheduler jobs."""
    if not APSCHEDULER_AVAILABLE or not scheduler:
        return []
    jobs = scheduler.get_jobs()
    result = []
    for job in jobs:
        result.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "args": [str(a) for a in job.args],
        })
    return result


async def _execute_scheduled_task(task_type: str, payload: dict):
    """Execute a scheduled task. Called by APScheduler."""
    if task_type == "follow_up":
        print(f"[Scheduler] Executing follow-up: {payload}")
        # In production: create Activity record, send notification, etc.
    elif task_type == "campaign_step":
        print(f"[Scheduler] Executing campaign step: {payload}")
        # In production: send email via Gmail service, track progress
    else:
        print(f"[Scheduler] Unknown task type: {task_type}")
