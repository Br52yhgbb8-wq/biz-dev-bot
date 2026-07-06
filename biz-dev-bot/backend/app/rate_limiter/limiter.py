"""Multi-strategy rate limiter (sliding window + token bucket, per-service configs).

Supports pluggable backends so different services can have
independent rate limits.  Token bucket is the default strategy;
sliding window is available as a lightweight alternative.
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional


# ── Per-service limit presets ──────────────────────────────────────

@dataclass
class RateLimitConfig:
    """Rate limit configuration for one service."""
    name: str
    max_rate: int            # max requests per window
    window_seconds: int = 60  # sliding window size (seconds)
    burst: int = 1            # token burst multiplier (token-bucket only)
    refill_rate: float = 1.0  # tokens/second refill (token-bucket only)


# These match typical free-tier / safe defaults — tune per deployment.
LIMIT_PRESETS: dict[str, RateLimitConfig] = {
    "gmail": RateLimitConfig(
        name="gmail",
        max_rate=25,           # Google allows ~250/user/sec; we stay conservative
        window_seconds=60,
        burst=10,
        refill_rate=0.5,       # 1 token per 2 seconds
    ),
    "linkedin": RateLimitConfig(
        name="linkedin",
        max_rate=10,           # LinkedIn aggressively rate-limits scrapers
        window_seconds=60,
        burst=3,
        refill_rate=0.2,       # 1 token per 5 seconds
    ),
    "login": RateLimitConfig(
        name="login",
        max_rate=5,            # Keep existing login limit
        window_seconds=60,
        burst=1,
        refill_rate=0.1,
    ),
    "llm_api": RateLimitConfig(  # Reserve for future DeepSeek / OpenAI
        name="llm_api",
        max_rate=60,
        window_seconds=60,
        burst=5,
        refill_rate=1.0,
    ),
}


# ── Sliding-window (existing approach, enhanced) ──────────────────

class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter (per-service).

    This is a drop-in replacement for the old single-instance
    ``rate_limiter`` but now supports multiple independent keys.
    """

    def __init__(self):
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def _clean(self, key: str, window: float):
        now = time.time()
        self._buckets[key] = [t for t in self._buckets[key] if now - t < window]

    def check(self, key: str, max_requests: int = 60, window_seconds: int = 60) -> bool:
        self._clean(key, window_seconds)
        if len(self._buckets[key]) >= max_requests:
            return False
        self._buckets[key].append(time.time())
        return True

    async def acheck(self, key: str, max_requests: int = 60, window_seconds: int = 60) -> bool:
        """Async variant — same logic, but awaitable for uniform call sites."""
        return self.check(key, max_requests, window_seconds)

    async def wait_until_ready(self, key: str, max_requests: int = 60,
                               window_seconds: int = 60, poll_interval: float = 0.5):
        """Block the coroutine until the limiter allows a new request."""
        while True:
            self._clean(key, window_seconds)
            if len(self._buckets[key]) < max_requests:
                self._buckets[key].append(time.time())
                return
            await asyncio.sleep(poll_interval)

    def get_remaining(self, key: str, max_requests: int = 60, window_seconds: int = 60) -> int:
        """Return how many requests are still available in the current window."""
        self._clean(key, window_seconds)
        return max(0, max_requests - len(self._buckets[key]))

    def get_reset_after(self, key: str, max_requests: int = 60, window_seconds: int = 60) -> float:
        """Return seconds until the oldest request in the window expires."""
        self._clean(key, window_seconds)
        if not self._buckets[key]:
            return 0.0
        return max(0.0, window_seconds - (time.time() - self._buckets[key][0]))


# ── Token-bucket (smoother burst handling) ────────────────────────

class TokenBucketLimiter:
    """Token-bucket rate limiter.

    A token bucket lets you control **average rate** while allowing short
    bursts.  This is gentler than a strict sliding window for API calls
    that come in clusters (e.g. syncing inbox then sending replies).
    """

    def __init__(self, config: RateLimitConfig):
        self.config = config
        self._tokens: float = float(config.burst)
        self._last_refill: float = time.time()
        self._lock = asyncio.Lock()

    @property
    def name(self) -> str:
        return self.config.name

    def _refill(self):
        now = time.time()
        elapsed = now - self._last_refill
        self._tokens = min(
            self.config.burst,
            self._tokens + elapsed * self.config.refill_rate,
        )
        self._last_refill = now

    def try_consume(self, tokens: int = 1) -> bool:
        self._refill()
        if self._tokens >= tokens:
            self._tokens -= tokens
            return True
        return False

    async def consume(self, tokens: int = 1):
        """Block until tokens are available, then consume."""
        while True:
            async with self._lock:
                self._refill()
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return
            sleep_for = self._seconds_until_next_token(tokens)
            await asyncio.sleep(sleep_for)

    def _seconds_until_next_token(self, tokens: int = 1) -> float:
        if self.config.refill_rate <= 0:
            return 10.0  # fallback
        return (tokens - self._tokens) / self.config.refill_rate

    def get_remaining(self) -> float:
        self._refill()
        return self._tokens

    def get_reset_after(self) -> float:
        self._refill()
        if self._tokens >= self.config.burst:
            return 0.0
        return self._seconds_until_next_token(1)


# ── Singleton instances ───────────────────────────────────────────

_instances: dict[str, TokenBucketLimiter] = {}


def get_gmail_limiter() -> TokenBucketLimiter:
    if "gmail" not in _instances:
        _instances["gmail"] = TokenBucketLimiter(LIMIT_PRESETS["gmail"])
    return _instances["gmail"]


def get_linkedin_limiter() -> TokenBucketLimiter:
    if "linkedin" not in _instances:
        _instances["linkedin"] = TokenBucketLimiter(LIMIT_PRESETS["linkedin"])
    return _instances["linkedin"]


def resolve_limiter(service_name: str) -> TokenBucketLimiter:
    """Get or create a limiter for an arbitrary service name.

    Falls back to ``llm_api`` presets if the name is unknown.
    """
    if service_name not in _instances:
        cfg = LIMIT_PRESETS.get(service_name, LIMIT_PRESETS["llm_api"])
        _instances[service_name] = TokenBucketLimiter(cfg)
    return _instances[service_name]


# Backward-compatible alias
rate_limiter = InMemoryRateLimiter()
