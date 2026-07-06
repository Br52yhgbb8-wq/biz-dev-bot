"""Exponential-backoff retry with jitter, 429 handling, and async support.

Usage::

    result = await retry_with_backoff(
        gmail_service.send_email,
        to=["a@b.com"],
        subject="Hi",
        body_text="Hello",
        service="gmail",
    )
"""

import asyncio
import random
from typing import Any, Callable, Optional, TypeVar

from app.rate_limiter.limiter import resolve_limiter, TokenBucketLimiter

T = TypeVar("T")

# HTTP status codes that are safe to retry
_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


def is_rate_limited(exc: Exception) -> bool:
    """Heuristic: check whether an exception signals rate limiting.

    Works with both standard library and google/requests exceptions.
    """
    msg = str(exc).lower()
    # HTTP 429
    if "429" in msg or "too many requests" in msg or "rate limit" in msg:
        return True
    # Google API errors
    if "quota" in msg and ("exceeded" in msg or "limit" in msg):
        return True
    # LinkedIn / browser-level
    if "blocked" in msg or "captcha" in msg or "challenge" in msg:
        return False  # Not rate-limited per se; handled separately
    return False


def is_retryable_error(exc: Exception) -> bool:
    """Return True if the exception is transient and worth retrying."""
    if is_rate_limited(exc):
        return True
    msg = str(exc).lower()
    # Transient network / server errors
    if "connection" in msg or "timeout" in msg or "reset" in msg:
        return True
    if "temporary" in msg or "unavailable" in msg or "server error" in msg:
        return True
    return False


def _compute_delay(attempt: int, base_delay: float = 1.0,
                   max_delay: float = 60.0, jitter: bool = True) -> float:
    """Exponential back-off with full jitter (AWS recommended style).

    ``delay = min(max_delay, base_delay * 2 ** attempt)``
    then uniform-random between 0 and that value (if jitter=True).
    """
    cap = min(max_delay, base_delay * (2 ** attempt))
    if jitter:
        return random.uniform(0, cap)
    return cap


async def retry_with_backoff(
    func: Callable[..., T],
    *args,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    service: Optional[str] = None,
    limiter: Optional[TokenBucketLimiter] = None,
    **kwargs,
) -> T:
    """Call *func(*args, **kwargs)* with retry + rate-limit gating.

    Parameters
    ----------
    service:
        If given, a ``TokenBucketLimiter`` is looked up via ``resolve_limiter``
        and consumed before each attempt.
    limiter:
        Direct limiter reference (mutually exclusive with ``service``).
    """
    if service and limiter:
        raise ValueError("Provide either service OR limiter, not both.")

    _limiter = limiter
    if service and not _limiter:
        _limiter = resolve_limiter(service)

    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        # 1. Rate-limit gate (wait until we have tokens)
        if _limiter:
            await _limiter.consume()

        # 2. Try the call
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, func, *args, **kwargs)
            return result
        except Exception as exc:
            last_exc = exc

        # 3. Decide whether to retry
        if not is_retryable_error(exc):
            raise
        if attempt >= max_retries:
            raise

        # 4. Wait with back-off
        delay = _compute_delay(attempt, base_delay, max_delay)
        await asyncio.sleep(delay)

    raise last_exc  # type: ignore[misc]


def retry_sync(
    func: Callable[..., T],
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    **kwargs,
) -> T:
    """Synchronous variant for functions that cannot be run in a thread pool.

    Does NOT do rate-limit gating — that should be handled at the
    caller level when using sync code paths.
    """
    last_exc: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            if not is_retryable_error(exc):
                raise
            if attempt >= max_retries:
                raise
            delay = _compute_delay(attempt, base_delay, max_delay)
            time.sleep(delay)
    raise last_exc  # type: ignore[misc]


# Import time for sync retry
import time  # noqa: E402
