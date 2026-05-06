"""
Security tests: JWT forgery, role escalation, token edge cases, RBAC.
"""

import time
from datetime import datetime, timedelta

import pytest
from jose import jwt

from app.auth import create_access_token, hash_password
from app.db_models import User


# ── Token forgery ─────────────────────────────────────────────────────────────

def test_token_signed_with_wrong_secret_returns_401(client, regular_user):
    forged = jwt.encode(
        {"sub": str(regular_user.id), "exp": int(time.time()) + 3600},
        "completely-wrong-secret",
        algorithm="HS256",
    )
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_token_with_algorithm_none_returns_401(client, regular_user):
    """Unsigned 'alg: none' tokens must be rejected."""
    import base64, json

    header = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).rstrip(b"=")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": str(regular_user.id), "exp": int(time.time()) + 3600}).encode()
    ).rstrip(b"=")
    none_token = f"{header.decode()}.{payload.decode()}."

    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {none_token}"})
    assert r.status_code == 401


def test_expired_token_returns_401(client, regular_user):
    expired = create_access_token(
        {"sub": str(regular_user.id)}, expires_delta=timedelta(seconds=-1)
    )
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_no_token_returns_401(client):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


def test_malformed_bearer_returns_401(client):
    r = client.get("/api/v1/users/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401


def test_non_integer_sub_returns_401(client):
    """JWT sub that is not an integer must return 401 (not 500)."""
    import os
    token = jwt.encode(
        {"sub": "not-an-integer", "exp": int(time.time()) + 3600},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.status_code != 500


# ── Role escalation ───────────────────────────────────────────────────────────

def test_regular_user_cannot_access_admin_users_list(client, auth_headers, regular_user):
    r = client.get("/api/v1/admin/users", headers=auth_headers)
    assert r.status_code == 403


def test_regular_user_cannot_access_admin_stats(client, auth_headers, regular_user):
    r = client.get("/api/v1/admin/stats", headers=auth_headers)
    assert r.status_code == 403


def test_token_claiming_admin_role_but_user_is_regular_returns_403(client, regular_user):
    """
    Even if the JWT payload contains role=admin, the DB role is authoritative.
    """
    import os
    token = jwt.encode(
        {
            "sub": str(regular_user.id),
            "role": "admin",
            "exp": int(time.time()) + 3600,
        },
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    r = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403, "DB role must be authoritative — JWT role claim is not trusted"


def test_deactivated_user_token_returns_401(client, db, inactive_user):
    token = create_access_token({"sub": str(inactive_user.id), "role": "user"})
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


# ── RBAC completeness ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("method, path", [
    ("GET",  "/api/v1/admin/users"),
    ("GET",  "/api/v1/admin/stats"),
    ("GET",  "/api/v1/admin/audit-log"),
    ("GET",  "/api/v1/admin/system-health"),
    ("GET",  "/api/v1/admin/announcements"),
    ("GET",  "/api/v1/admin/settings"),
])
def test_admin_endpoints_reject_no_auth(client, method, path):
    r = client.request(method, path)
    assert r.status_code in (401, 403), f"{method} {path} must require auth"


@pytest.mark.parametrize("method, path", [
    ("GET",  "/api/v1/admin/users"),
    ("GET",  "/api/v1/admin/stats"),
    ("GET",  "/api/v1/admin/audit-log"),
    ("GET",  "/api/v1/admin/system-health"),
    ("GET",  "/api/v1/admin/announcements"),
    ("GET",  "/api/v1/admin/settings"),
])
def test_admin_endpoints_reject_regular_user(client, auth_headers, regular_user, method, path):
    r = client.request(method, path, headers=auth_headers)
    assert r.status_code == 403, f"{method} {path} must reject non-admin users"
