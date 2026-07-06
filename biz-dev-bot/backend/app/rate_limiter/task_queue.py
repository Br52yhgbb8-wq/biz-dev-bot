"""Async task queue with priority and rate-limit backpressure."""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable, Coroutine, Optional

logger = logging.getLogger(__name__)


class TaskPriority(IntEnum):
    LOW = 10
    NORMAL = 5
    HIGH = 1
    CRITICAL = 0


@dataclass(order=True)
class _QueueItem:
    priority: TaskPriority
    timestamp: float = field(compare=False)
    coro: Any = field(compare=False)
    task_type: str = field(compare=False, default="")
    task_id: str = field(compare=False, default="")


class TaskQueue:
    """Async priority queue that runs tasks through a limiter sequentially."""

    def __init__(self, max_concurrent: int = 3, name: str = "default"):
        self.name = name
        self._max_concurrent = max_concurrent
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._active_count = 0
        self._lock = asyncio.Lock()
        self._total_enqueued = 0
        self._total_completed = 0
        self._total_failed = 0

    @property
    def stats(self) -> dict:
        return {
            "name": self.name,
            "queue_size": self._queue.qsize(),
            "max_concurrent": self._max_concurrent,
            "active": self._active_count,
            "enqueued": self._total_enqueued,
            "completed": self._total_completed,
            "failed": self._total_failed,
            "running": self._running,
        }

    def enqueue(self, coro: Coroutine, priority: TaskPriority = TaskPriority.NORMAL, task_type: str = "", task_id: str = "") -> str:
        if not task_id:
            task_id = f"{task_type}_{int(time.time() * 1000)}_{id(coro)}"
        item = _QueueItem(priority=priority, timestamp=time.time(), coro=coro, task_type=task_type, task_id=task_id)
        self._queue.put_nowait(item)
        self._total_enqueued += 1
        return task_id

    async def start(self):
        if self._running:
            return
        self._running = True
        self._worker_task = asyncio.create_task(self._worker_loop())
        logger.info("TaskQueue[%s] started (max_concurrent=%d)", self.name, self._max_concurrent)

    async def stop(self, wait: bool = True):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
        logger.info("TaskQueue[%s] stopped", self.name)

    async def _worker_loop(self):
        sem = asyncio.Semaphore(self._max_concurrent)

        async def _run_one(item: _QueueItem):
            async with sem:
                async with self._lock:
                    self._active_count += 1
                try:
                    await item.coro
                    async with self._lock:
                        self._total_completed += 1
                except Exception:
                    logger.exception("TaskQueue[%s] task failed: type=%s id=%s", self.name, item.task_type, item.task_id)
                    async with self._lock:
                        self._total_failed += 1
                finally:
                    async with self._lock:
                        self._active_count -= 1

        while self._running:
            try:
                item = await self._queue.get()
                asyncio.create_task(_run_one(item))
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("TaskQueue[%s] worker error", self.name)


_task_queue: Optional[TaskQueue] = None


def get_task_queue() -> TaskQueue:
    global _task_queue
    if _task_queue is None:
        _task_queue = TaskQueue(max_concurrent=3, name="default")
    return _task_queue


async def ensure_task_queue_running():
    q = get_task_queue()
    await q.start()
    return q


async def shutdown_task_queue():
    q = get_task_queue()
    await q.stop(wait=True)
    return q
