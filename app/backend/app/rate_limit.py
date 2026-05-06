"""
In-memory sliding-window rate limiter. No external dependencies.
Usage:  check_rate_limit(key, max_calls, window_seconds)
Raises HTTPException(429) when the limit is exceeded.
"""
import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException

_store: dict = defaultdict(list)
_lock = Lock()


def _cleanup(key: str, window: float) -> None:
    now = time.monotonic()
    _store[key] = [t for t in _store[key] if now - t < window]


def check_rate_limit(key: str, max_calls: int, window_seconds: float) -> None:
    with _lock:
        _cleanup(key, window_seconds)
        if len(_store[key]) >= max_calls:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
            )
        _store[key].append(time.monotonic())
