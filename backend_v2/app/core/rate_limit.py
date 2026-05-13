"""Sliding-window rate limiting with pluggable storage.

The default memory store is safe for local/dev and single-worker deployments.
For multi-worker production, set CLOCKLY_RATE_LIMIT_BACKEND=redis and provide
CLOCKLY_REDIS_URL.
"""
from __future__ import annotations

import secrets
import time
from collections import defaultdict
from threading import Lock
from typing import Protocol

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import RateLimitError


class RateLimitStore(Protocol):
    def allow(self, key: str, *, max_requests: int, window_seconds: int) -> bool:
        ...


class InMemorySlidingWindowStore:
    def __init__(self) -> None:
        self.buckets: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def allow(self, key: str, *, max_requests: int, window_seconds: int) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            timestamps = self.buckets[key]
            while timestamps and timestamps[0] < cutoff:
                timestamps.pop(0)
            if len(timestamps) >= max_requests:
                return False
            timestamps.append(now)
            return True


class NoopRateLimitStore:
    def allow(self, key: str, *, max_requests: int, window_seconds: int) -> bool:
        return True


class RedisSlidingWindowStore:
    def __init__(self, redis_url: str, *, prefix: str) -> None:
        try:
            from redis import Redis
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "CLOCKLY_RATE_LIMIT_BACKEND=redis requires the optional 'redis' Python package."
            ) from exc

        self._client = Redis.from_url(redis_url, decode_responses=True)
        self._prefix = prefix

    def allow(self, key: str, *, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        bucket = f"{self._prefix}:{key}"
        member = f"{now}:{secrets.token_hex(4)}"
        pipe = self._client.pipeline()
        pipe.zremrangebyscore(bucket, 0, cutoff)
        pipe.zadd(bucket, {member: now})
        pipe.zcard(bucket)
        pipe.expire(bucket, window_seconds)
        _, _, count, _ = pipe.execute()
        return int(count) <= max_requests


class SlidingWindowLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        *,
        store: RateLimitStore,
        key_prefix: str,
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._store = store
        self._buckets = getattr(store, "buckets", {})
        self.key_prefix = key_prefix

    def check(self, key: str) -> None:
        scoped_key = f"{self.key_prefix}:{key}"
        if not self._store.allow(scoped_key, max_requests=self.max_requests, window_seconds=self.window_seconds):
            raise RateLimitError(
                f"Demasiados intentos. Espera {self.window_seconds} segundos antes de volver a intentarlo.",
                retry_after_seconds=self.window_seconds,
                limit=self.max_requests,
                window_seconds=self.window_seconds,
            )


def _build_store() -> RateLimitStore:
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return NoopRateLimitStore()
    backend = settings.rate_limit_backend.lower()
    if backend == "memory":
        return InMemorySlidingWindowStore()
    if backend == "redis":
        if not settings.redis_url:
            raise RuntimeError("CLOCKLY_REDIS_URL is required when CLOCKLY_RATE_LIMIT_BACKEND=redis.")
        return RedisSlidingWindowStore(settings.redis_url, prefix=settings.rate_limit_key_prefix)
    raise RuntimeError("CLOCKLY_RATE_LIMIT_BACKEND must be 'memory' or 'redis'.")


_store = _build_store()

# 5 login attempts per IP per 60 s prevents credential brute force.
login_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=60, store=_store, key_prefix="login")

# 5 public company registrations per IP per 5 min prevents signup abuse.
registration_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=300, store=_store, key_prefix="registration")

# 5 reset requests per IP per 5 min prevents mailbox and token abuse.
password_reset_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=300, store=_store, key_prefix="password-reset")

# 20 refresh attempts per IP per 60 s; real users should rarely hit this.
refresh_limiter = SlidingWindowLimiter(max_requests=20, window_seconds=60, store=_store, key_prefix="refresh")

# 10 kiosk clock-in/out attempts per IP per 60 s prevents PIN brute force.
kiosk_limiter = SlidingWindowLimiter(max_requests=10, window_seconds=60, store=_store, key_prefix="kiosk")

# Invitation endpoints are public enough to deserve their own budget.
invitation_limiter = SlidingWindowLimiter(max_requests=10, window_seconds=300, store=_store, key_prefix="invitation")

# Authenticated file exports are heavier and contain tenant data; scope checks by user/company.
export_limiter = SlidingWindowLimiter(max_requests=20, window_seconds=300, store=_store, key_prefix="exports")

# GDPR read/write endpoints are legitimate but sensitive enough to slow enumeration.
gdpr_limiter = SlidingWindowLimiter(max_requests=30, window_seconds=300, store=_store, key_prefix="gdpr")

# Personal-data exports should be rare, so they get a stricter budget.
gdpr_export_limiter = SlidingWindowLimiter(max_requests=10, window_seconds=600, store=_store, key_prefix="gdpr-export")

# Authenticated uploads/imports can carry sensitive tenant data and are expensive to parse.
upload_limiter = SlidingWindowLimiter(max_requests=30, window_seconds=300, store=_store, key_prefix="uploads")


def client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For when behind a trusted proxy."""
    settings = get_settings()
    xff = request.headers.get("x-forwarded-for")
    if settings.trust_proxy_headers and xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
