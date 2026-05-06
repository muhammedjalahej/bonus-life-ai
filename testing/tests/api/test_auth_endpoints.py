"""API tests for /api/v1/auth/* endpoints."""

import secrets
from datetime import datetime, timedelta

import pytest

from app.db_models import User
from app.auth import hash_password


# ── POST /auth/register ───────────────────────────────────────────────────────

def test_register_valid_data_returns_200(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "Password123!",
        "full_name": "New User",
    })
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "newuser@example.com"


def test_register_returns_user_with_correct_role(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "rolecheck@example.com",
        "password": "Password123!",
    })
    assert r.json()["user"]["role"] == "user"


def test_register_lowercases_email(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "MixedCase@Example.COM",
        "password": "Password123!",
    })
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "mixedcase@example.com"


def test_register_duplicate_email_returns_400(client):
    data = {"email": "dup@example.com", "password": "Password123!"}
    client.post("/api/v1/auth/register", json=data)
    r = client.post("/api/v1/auth/register", json=data)
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


def test_register_password_too_short_returns_422(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "short@example.com",
        "password": "1234567",  # 7 chars, min is 8
    })
    assert r.status_code == 422


def test_register_missing_email_returns_422(client):
    r = client.post("/api/v1/auth/register", json={"password": "Password123!"})
    assert r.status_code == 422


def test_register_missing_password_returns_422(client):
    r = client.post("/api/v1/auth/register", json={"email": "nopw@example.com"})
    assert r.status_code == 422


# ── POST /auth/login ──────────────────────────────────────────────────────────

def test_login_valid_credentials_returns_token(client, regular_user):
    r = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "Password123!",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password_returns_401(client, regular_user):
    r = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "WrongPassword!",
    })
    assert r.status_code == 401
    assert "Invalid" in r.json()["detail"]


def test_login_nonexistent_user_returns_401(client):
    r = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "Password123!",
    })
    assert r.status_code == 401


def test_login_inactive_user_returns_403(client, inactive_user):
    r = client.post("/api/v1/auth/login", json={
        "email": "inactive@example.com",
        "password": "Password123!",
    })
    assert r.status_code == 403
    assert "disabled" in r.json()["detail"].lower()


def test_login_case_insensitive_email(client, regular_user):
    r = client.post("/api/v1/auth/login", json={
        "email": "TESTUSER@EXAMPLE.COM",
        "password": "Password123!",
    })
    assert r.status_code == 200


# ── GET /auth/me ──────────────────────────────────────────────────────────────

def test_me_without_token_returns_401(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_with_valid_token_returns_user(client, auth_headers, regular_user):
    r = client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "testuser@example.com"
    assert body["role"] == "user"


def test_me_with_invalid_token_returns_401(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
    assert r.status_code == 401


# ── POST /auth/forgot-password ────────────────────────────────────────────────

def test_forgot_password_known_email_returns_200(client, regular_user):
    r = client.post("/api/v1/auth/forgot-password", json={"email": "testuser@example.com"})
    assert r.status_code == 200
    assert "message" in r.json()


def test_forgot_password_unknown_email_returns_same_message(client):
    r = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert "message" in r.json()


def test_forgot_password_does_not_leak_account_existence(client, regular_user):
    """Both registered and unknown emails must return the same response body."""
    r_known = client.post("/api/v1/auth/forgot-password", json={"email": "testuser@example.com"})
    r_unknown = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r_known.json()["message"] == r_unknown.json()["message"]


# ── POST /auth/reset-password ─────────────────────────────────────────────────

def test_reset_password_with_valid_token(client, db, regular_user):
    token = secrets.token_urlsafe(32)
    regular_user.password_reset_token = token
    regular_user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    r = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "NewPassword456!",
    })
    assert r.status_code == 200
    assert "updated" in r.json()["message"].lower() or "password" in r.json()["message"].lower()


def test_reset_password_with_invalid_token_returns_400(client):
    r = client.post("/api/v1/auth/reset-password", json={
        "token": "nonexistent-token",
        "new_password": "NewPassword456!",
    })
    assert r.status_code == 400


def test_reset_password_with_expired_token_returns_400(client, db, regular_user):
    token = secrets.token_urlsafe(32)
    regular_user.password_reset_token = token
    regular_user.password_reset_expires = datetime.utcnow() - timedelta(hours=2)
    db.commit()

    r = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "NewPassword456!",
    })
    assert r.status_code == 400


def test_reset_password_too_short_returns_400_or_422(client, db, regular_user):
    token = secrets.token_urlsafe(32)
    regular_user.password_reset_token = token
    regular_user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    r = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "short",
    })
    assert r.status_code in (400, 422)
