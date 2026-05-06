"""
Security tests: input validation, injection resistance, suspicious payloads.
"""

import pytest


# ── SQL injection attempts ────────────────────────────────────────────────────

def test_sql_injection_in_email_does_not_crash(client):
    """SQL metacharacters in the email field must not crash the server."""
    r = client.post("/api/v1/auth/login", json={
        "email": "' OR 1=1 --",
        "password": "anything",
    })
    assert r.status_code in (401, 422)
    assert r.status_code != 500


def test_sql_injection_in_email_register_does_not_crash(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "'; DROP TABLE users; --",
        "password": "Password123!",
    })
    assert r.status_code in (400, 422, 200)
    assert r.status_code != 500


# ── XSS / HTML injection ──────────────────────────────────────────────────────

def test_script_tag_in_full_name_stored_as_literal(client, auth_headers, regular_user):
    """HTML/script tags in full_name must be stored literally, not executed."""
    r = client.patch("/api/v1/users/me", headers=auth_headers, json={
        "full_name": "<script>alert('xss')</script>",
    })
    assert r.status_code == 200
    assert r.json()["full_name"] == "<script>alert('xss')</script>"


# ── Oversized inputs ──────────────────────────────────────────────────────────

def test_extremely_long_email_rejected_or_handled(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "a" * 300 + "@example.com",
        "password": "Password123!",
    })
    # Must not crash the server
    assert r.status_code != 500


def test_extremely_long_full_name_accepted_or_truncated(client, auth_headers, regular_user):
    r = client.patch("/api/v1/users/me", headers=auth_headers, json={
        "full_name": "X" * 1000,
    })
    assert r.status_code != 500


# ── Settings injection ────────────────────────────────────────────────────────

def test_settings_arbitrary_key_injection_blocked(client, admin_headers, admin_user):
    """Admin cannot inject arbitrary setting keys."""
    r = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "debug_mode",
        "value": "true",
    })
    assert r.status_code == 400


def test_settings_allowed_keys_still_work(client, admin_headers, admin_user):
    r = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "allow_signups",
        "value": "true",
    })
    assert r.status_code == 200


# ── Empty / null edge cases ───────────────────────────────────────────────────

def test_empty_bearer_token_returns_401(client):
    r = client.get("/api/v1/users/me", headers={"Authorization": "Bearer "})
    assert r.status_code == 401


def test_missing_authorization_header_returns_401(client):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


def test_wrong_auth_scheme_returns_401(client, user_token):
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Basic {user_token}"})
    assert r.status_code == 401


# ── Assessment input: no negative probabilities from model ───────────────────

def test_assessment_probability_is_non_negative(client):
    payload = {
        "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
        "height": 170.0, "age": 35, "pregnancies": 0,
        "skin_thickness": 20.0, "insulin": 80.0,
        "diabetes_pedigree_function": 0.5, "language": "english",
    }
    r = client.post("/api/v1/diabetes-assessment", json=payload)
    assert r.status_code == 200
    prob = r.json()["risk_analysis"]["probability"]
    assert prob >= 0.0
    assert prob <= 1.0


# ── Admin cannot access another user's private data ──────────────────────────

def test_user_cannot_see_another_users_assessments(client, db, regular_user, admin_user):
    """
    A regular user must only see their own assessment history.
    They cannot access admin endpoints to see other users' data.
    """
    from app.auth import create_access_token
    regular_token = create_access_token({"sub": str(regular_user.id), "role": "user"})
    headers = {"Authorization": f"Bearer {regular_token}"}

    r = client.get("/api/v1/admin/assessments", headers=headers)
    assert r.status_code == 403


def test_error_response_does_not_include_path(client):
    """Error responses must not include the 'path' field (SEC-07 regression)."""
    r = client.get("/api/v1/admin/users")
    assert "path" not in r.json()
