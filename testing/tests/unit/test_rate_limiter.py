"""Unit tests for app/rate_limit.py — sliding-window logic."""

import time

import pytest
from fastapi import HTTPException

from app.rate_limit import check_rate_limit, _store


@pytest.fixture(autouse=True)
def clean_store():
    _store.clear()
    yield
    _store.clear()


# ── basic allow/deny ──────────────────────────────────────────────────────────

def test_single_call_is_allowed():
    check_rate_limit("ip:1.2.3.4", max_calls=5, window_seconds=60)


def test_calls_up_to_limit_are_allowed():
    for _ in range(5):
        check_rate_limit("ip:1.2.3.5", max_calls=5, window_seconds=60)


def test_call_over_limit_raises_429():
    for _ in range(5):
        check_rate_limit("ip:1.2.3.6", max_calls=5, window_seconds=60)
    with pytest.raises(HTTPException) as exc_info:
        check_rate_limit("ip:1.2.3.6", max_calls=5, window_seconds=60)
    assert exc_info.value.status_code == 429


def test_different_keys_are_independent():
    for _ in range(5):
        check_rate_limit("ip:key-a", max_calls=5, window_seconds=60)
    # key-b should still be allowed
    check_rate_limit("ip:key-b", max_calls=5, window_seconds=60)


# ── window expiry ─────────────────────────────────────────────────────────────

def test_calls_reset_after_window():
    """After the window passes, the counter resets and calls are allowed again."""
    for _ in range(3):
        check_rate_limit("ip:expiry-test", max_calls=3, window_seconds=0.1)
    with pytest.raises(HTTPException):
        check_rate_limit("ip:expiry-test", max_calls=3, window_seconds=0.1)
    time.sleep(0.15)
    # Should succeed now — old entries expired
    check_rate_limit("ip:expiry-test", max_calls=3, window_seconds=0.1)


def test_tiny_window_clears_quickly():
    check_rate_limit("ip:tiny", max_calls=1, window_seconds=0.05)
    with pytest.raises(HTTPException):
        check_rate_limit("ip:tiny", max_calls=1, window_seconds=0.05)
    time.sleep(0.1)
    check_rate_limit("ip:tiny", max_calls=1, window_seconds=0.05)


# ── limit=1 edge case ─────────────────────────────────────────────────────────

def test_limit_one_allows_first_call():
    check_rate_limit("ip:limit1", max_calls=1, window_seconds=60)


def test_limit_one_blocks_second_call():
    check_rate_limit("ip:limit1-b", max_calls=1, window_seconds=60)
    with pytest.raises(HTTPException) as exc:
        check_rate_limit("ip:limit1-b", max_calls=1, window_seconds=60)
    assert exc.value.status_code == 429
    assert "Too many requests" in exc.value.detail
