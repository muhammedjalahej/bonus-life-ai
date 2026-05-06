"""API tests for /api/v1/users/me/* endpoints."""

import pytest


# ── GET /users/me ─────────────────────────────────────────────────────────────

def test_get_me_no_auth_returns_401(client):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


def test_get_me_with_auth_returns_profile(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "testuser@example.com"
    assert body["role"] == "user"
    assert "id" in body
    assert "subscription_tier" in body


def test_get_me_response_has_expected_fields(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me", headers=auth_headers)
    body = r.json()
    required = {"id", "email", "full_name", "role", "is_active", "totp_enabled", "onboarding_completed"}
    assert required.issubset(body.keys())


# ── PATCH /users/me ───────────────────────────────────────────────────────────

def test_update_me_full_name(client, auth_headers, regular_user):
    r = client.patch("/api/v1/users/me", headers=auth_headers, json={"full_name": "Updated Name"})
    assert r.status_code == 200
    assert r.json()["full_name"] == "Updated Name"


def test_update_me_language(client, auth_headers, regular_user):
    r = client.patch("/api/v1/users/me", headers=auth_headers, json={"preferred_language": "arabic"})
    assert r.status_code == 200
    assert r.json()["preferred_language"] == "arabic"


def test_update_me_no_auth_returns_401(client):
    r = client.patch("/api/v1/users/me", json={"full_name": "Hacker"})
    assert r.status_code == 401


def test_update_me_partial_update_preserves_other_fields(client, auth_headers, regular_user):
    r = client.patch("/api/v1/users/me", headers=auth_headers, json={"full_name": "OnlyName"})
    assert r.status_code == 200
    body = r.json()
    assert body["full_name"] == "OnlyName"
    assert body["email"] == "testuser@example.com"


# ── GET /users/me/assessments ─────────────────────────────────────────────────

def test_list_assessments_no_auth_returns_401(client):
    r = client.get("/api/v1/users/me/assessments")
    assert r.status_code == 401


def test_list_assessments_empty_for_new_user(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me/assessments", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) == 0


def test_list_heart_assessments_returns_list(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me/heart-assessments", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_ckd_assessments_returns_list(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me/ckd-assessments", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_diet_plans_returns_list(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me/diet-plans", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── POST /users/me/change-password ───────────────────────────────────────────

def test_change_password_valid(client, auth_headers, regular_user):
    r = client.post("/api/v1/users/me/change-password", headers=auth_headers, json={
        "current_password": "Password123!",
        "new_password": "NewStrongPassword!",
    })
    assert r.status_code == 200


def test_change_password_wrong_current_returns_400(client, auth_headers, regular_user):
    r = client.post("/api/v1/users/me/change-password", headers=auth_headers, json={
        "current_password": "WrongCurrentPassword",
        "new_password": "NewStrongPassword!",
    })
    assert r.status_code in (400, 401)


def test_change_password_new_too_short_returns_422(client, auth_headers, regular_user):
    r = client.post("/api/v1/users/me/change-password", headers=auth_headers, json={
        "current_password": "Password123!",
        "new_password": "short",
    })
    assert r.status_code == 422


def test_change_password_no_auth_returns_401(client):
    r = client.post("/api/v1/users/me/change-password", json={
        "current_password": "Password123!",
        "new_password": "NewPassword123!",
    })
    assert r.status_code == 401


# ── GET /users/me/notifications ───────────────────────────────────────────────

def test_list_notifications_no_auth_returns_401(client):
    r = client.get("/api/v1/users/me/notifications")
    assert r.status_code == 401


def test_list_notifications_empty_for_new_user(client, auth_headers, regular_user):
    r = client.get("/api/v1/users/me/notifications", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
