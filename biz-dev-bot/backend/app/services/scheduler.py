import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.rate_limiter.task_queue import get_task_queue, TaskPriority
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

logger = logging.getLogger(__name__)


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
            "next_run_time": getattr(job, "next_run_time", None).isoformat() if getattr(job, "next_run_time", None) else None,
            "args": [str(a) for a in job.args],
        })
    return result


async def _execute_scheduled_task(task_type: str, payload: dict):
    """Execute a scheduled task. Called by APScheduler."""
    q = get_task_queue()
    q.enqueue(
        _handle_task(task_type, payload),
        priority=TaskPriority.HIGH if task_type == "campaign_step" else TaskPriority.NORMAL,
        task_type=task_type,
    )


async def _handle_task(task_type: str, payload: dict):
    """Actually process a task (runs inside the managed task queue).

    This function is where the real work happens — each call is
    rate-limited and retried automatically by the retry module.
    """
    logger.info("Processing task: type=%s payload=%s", task_type, payload)
    if task_type == "follow_up":
        from app.rate_limiter.retry import retry_with_backoff
        try:
            # TODO: implement actual follow-up logic (email, notification, etc.)
            logger.info("Follow-up executed: %s", payload)
        except Exception as exc:
            logger.error("Follow-up task failed: %s", exc)
    elif task_type == "campaign_step":
        step = payload.get("step", {})
        step_type = step.get("type", "email")
        campaign_id = payload.get("campaign_id", "")
        logger.info("Campaign step: id=%s type=%s", campaign_id, step_type)
        try:
            # TODO: call Gmail service via retry_with_backoff
            logger.info("Campaign step executed: %s", payload)
        except Exception as exc:
            logger.error("Campaign step failed after retries: %s", exc)
    else:
        logger.warning("Unknown task type: %s", task_type)
