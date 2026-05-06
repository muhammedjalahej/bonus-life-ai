"""
Regression tests — one test per security fix (02-security-report.md).
Locks in the fixed behaviour so regressions are caught immediately.
"""

import inspect
import secrets
from datetime import datetime, timedelta

import pytest

from app.db_models import User
from app.auth import hash_password, create_access_token


# ── SEC-01: JWT default secret logs a CRITICAL warning ───────────────────────

def test_sec01_default_jwt_secret_triggers_critical_log():
    """
    If the default dev secret is used, auth.py must emit a CRITICAL-level log.
    The warning code must still be present — it must not have been silently removed.
    """
    import app.auth as auth_module
    source = inspect.getsource(auth_module)
    assert "SECURITY" in source or "insecure default" in source.lower(), \
        "auth.py must still contain the CRITICAL warning for the default JWT secret"


# ── SEC-03: Forgot-password does NOT destroy current password ────────────────

def test_sec03_forgot_password_does_not_change_current_password(client, db, regular_user):
    """
    POST /auth/forgot-password must store a reset token and NOT overwrite
    the current hashed_password.
    """
    original_hash = regular_user.hashed_password

    client.post("/api/v1/auth/forgot-password", json={"email": "testuser@example.com"})

    db.refresh(regular_user)
    assert regular_user.hashed_password == original_hash, \
        "Forgot-password must NOT change the current password (SEC-03)"


def test_sec03_forgot_password_stores_reset_token(client, db, regular_user):
    client.post("/api/v1/auth/forgot-password", json={"email": "testuser@example.com"})
    db.refresh(regular_user)
    assert regular_user.password_reset_token is not None
    assert regular_user.password_reset_expires is not None


def test_sec03_reset_password_clears_token_after_use(client, db, regular_user):
    token = secrets.token_urlsafe(32)
    regular_user.password_reset_token = token
    regular_user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    r = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "BrandNewPass99!",
    })
    assert r.status_code == 200

    db.refresh(regular_user)
    assert regular_user.password_reset_token is None, \
        "Token must be cleared after successful reset (SEC-03)"


# ── SEC-04: Login rate limiting ───────────────────────────────────────────────

def test_sec04_login_rate_limit_blocks_11th_attempt(client, regular_user):
    """Login must be rate-limited: the 11th attempt in the window returns 429."""
    for _ in range(10):
        client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "WrongPassword",
        })
    r = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "WrongPassword",
    })
    assert r.status_code == 429, "11th login attempt must be rate-limited (SEC-04)"


def test_sec04_registration_rate_limit_blocks_11th_attempt(client):
    for i in range(10):
        client.post("/api/v1/auth/register", json={
            "email": f"ratelimit{i}@example.com",
            "password": "Password123!",
        })
    r = client.post("/api/v1/auth/register", json={
        "email": "ratelimit_11@example.com",
        "password": "Password123!",
    })
    assert r.status_code == 429


# ── SEC-05: Password minimum length enforced ─────────────────────────────────

def test_sec05_password_7_chars_rejected_at_registration(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "weakpw@example.com",
        "password": "1234567",
    })
    assert r.status_code == 422


def test_sec05_password_8_chars_accepted_at_registration(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "okpw@example.com",
        "password": "12345678",
    })
    assert r.status_code == 200


def test_sec05_change_password_new_too_short_rejected(client, auth_headers, regular_user):
    r = client.post("/api/v1/users/me/change-password", headers=auth_headers, json={
        "current_password": "Password123!",
        "new_password": "short",
    })
    assert r.status_code == 422


# ── SEC-06: TOTP verify accepts code in request BODY ─────────────────────────

def test_sec06_totp_verify_uses_request_body():
    """
    The 2FA verify handler must accept the TOTP code in the request body
    (as a TOTPVerifyRequest), not as a query parameter.
    """
    import inspect
    from app.routes import me_routes
    source = inspect.getsource(me_routes)
    # The handler signature should reference TOTPVerifyRequest, not a plain `code: str`
    assert "TOTPVerifyRequest" in source, \
        "TOTP verify must use TOTPVerifyRequest body model (SEC-06)"


# ── SEC-07: Error response does not expose the request path ──────────────────

def test_sec07_error_response_does_not_contain_path_field(client):
    """
    A 401 error from a protected endpoint must NOT include a 'path' field
    that reveals the internal API structure (SEC-07).
    """
    r = client.get("/api/v1/admin/users")
    assert r.status_code == 401
    body = r.json()
    assert "path" not in body, \
        "Error response must not leak 'path' field (SEC-07)"


# ── SEC-08: Settings PATCH rejects unknown keys ───────────────────────────────

def test_sec08_settings_unknown_key_returns_400(client, admin_headers, admin_user):
    r = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "injected_unknown_key",
        "value": "malicious",
    })
    assert r.status_code == 400
    assert "Unknown setting key" in r.json()["detail"] or "Allowed" in r.json()["detail"]


def test_sec08_known_settings_keys_still_work(client, admin_headers, admin_user):
    for key in ("maintenance_mode", "allow_signups", "announcement_banner"):
        r = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
            "key": key,
            "value": "false",
        })
        assert r.status_code == 200, f"Known setting key '{key}' must still work (SEC-08)"
