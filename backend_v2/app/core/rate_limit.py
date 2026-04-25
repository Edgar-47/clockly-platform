"""Sliding-window in-memory rate limiter.

IMPORTANT: This is a single-process implementation.
In multi-worker or multi-node deployments, use a Redis-backed solution
(e.g. slowapi with redis storage) to enforce limits across all workers.
"""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import Request

from app.core.errors import RateLimitError


class SlidingWindowLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> None:
        """Raise RateLimitError if the key has exceeded max_requests in the window."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            ts = self._buckets[key]
            # Evict timestamps outside the window
            while ts and ts[0] < cutoff:
                ts.pop(0)
            if len(ts) >= self.max_requests:
                raise RateLimitError(
                    f"Demasiados intentos. Espera {self.window_seconds} segundos antes de volver a intentarlo."
                )
            ts.append(now)


# 5 login attempts per IP per 60 s — prevents credential brute force
login_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=60)

# 20 refresh attempts per IP per 60 s — tokens expire at 15 min, so real users
# rarely refresh more than once per minute even with multiple browser tabs
refresh_limiter = SlidingWindowLimiter(max_requests=20, window_seconds=60)

# 10 kiosk clock-in/out attempts per IP per 60 s — prevents PIN brute force
kiosk_limiter = SlidingWindowLimiter(max_requests=10, window_seconds=60)


def client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For when behind a trusted proxy."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
