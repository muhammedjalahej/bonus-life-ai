"""
Security tests: rate limiting enforcement on authentication endpoints.
"""

import pytest

from app.rate_limit import _store


@pytest.fixture(autouse=True)
def clean():
    _store.clear()
    yield
    _store.clear()


# ── Login rate limiting ───────────────────────────────────────────────────────

def test_login_allows_10_attempts(client, regular_user):
    for i in range(10):
        r = client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": f"wrong-attempt-{i}",
        })
        assert r.status_code != 429, f"Attempt {i+1} should not be rate-limited yet"


def test_login_blocks_on_11th_attempt(client, regular_user):
    for _ in range(10):
        client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "wrong",
        })
    r = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "wrong",
    })
    assert r.status_code == 429
    assert "Too many requests" in r.json()["detail"]


# ── Registration rate limiting ────────────────────────────────────────────────

def test_register_allows_10_attempts(client):
    for i in range(10):
        r = client.post("/api/v1/auth/register", json={
            "email": f"ratelimit{i}@example.com",
            "password": "Password123!",
        })
        assert r.status_code != 429, f"Registration attempt {i+1} should not be rate-limited"


def test_register_blocks_on_11th_attempt(client):
    for i in range(10):
        client.post("/api/v1/auth/register", json={
            "email": f"reg{i}@example.com",
            "password": "Password123!",
        })
    r = client.post("/api/v1/auth/register", json={
        "email": "blocked@example.com",
        "password": "Password123!",
    })
    assert r.status_code == 429


# ── Forgot-password rate limiting ─────────────────────────────────────────────

def test_forgot_password_allows_3_attempts(client):
    for i in range(3):
        r = client.post("/api/v1/auth/forgot-password", json={
            "email": f"attempt{i}@example.com",
        })
        assert r.status_code != 429, f"Forgot-password attempt {i+1} must not be rate-limited"


def test_forgot_password_blocks_on_4th_attempt(client):
    for _ in range(3):
        client.post("/api/v1/auth/forgot-password", json={"email": "test@example.com"})
    r = client.post("/api/v1/auth/forgot-password", json={"email": "test@example.com"})
    assert r.status_code == 429


# ── Rate limit response format ────────────────────────────────────────────────

def test_rate_limit_response_has_detail_field(client, regular_user):
    for _ in range(11):
        r = client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "wrong",
        })
    assert "detail" in r.json()


# ── Keys are per-IP (TestClient uses testclient as IP) ───────────────────────

def test_rate_limit_does_not_bleed_across_endpoints(client, regular_user):
    """
    Hitting the login rate limit must not affect the forgot-password endpoint.
    """
    for _ in range(11):
        client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "wrong",
        })
    # forgot-password should still work (different key prefix)
    r = client.post("/api/v1/auth/forgot-password", json={"email": "testuser@example.com"})
    assert r.status_code == 200
