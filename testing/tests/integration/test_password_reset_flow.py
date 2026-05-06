"""
GAP 2 — Password reset token correctness (DB-level verification).

SEC-03 changed the flow from temp-password to token-link. These tests verify
the full token lifecycle at the database layer, supplementing the HTTP-level
tests already in api/test_auth_endpoints.py.
"""

import pytest
from datetime import datetime, timedelta
from app.auth import hash_password
from app.db_models import User


@pytest.fixture
def reset_user(db):
    """A regular user whose password can be reset."""
    user = User(
        email="resetme@example.com",
        hashed_password=hash_password("OldPassword1!"),
        full_name="Reset Me",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_forgot_password_stores_token_in_db(client, db, reset_user):
    """After POST /auth/forgot-password the DB row must have a non-null reset token."""
    r = client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    assert r.status_code == 200

    db.refresh(reset_user)
    assert reset_user.password_reset_token is not None, (
        "password_reset_token must be set after forgot-password request"
    )


def test_forgot_password_sets_future_expiry(client, db, reset_user):
    """The token expiry must be in the future after forgot-password."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)

    assert reset_user.password_reset_expires is not None
    assert reset_user.password_reset_expires > datetime.utcnow(), (
        "password_reset_expires must be a future timestamp"
    )


def test_forgot_password_expiry_within_two_hours(client, db, reset_user):
    """The token expiry must be at most 2 hours from now."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)

    two_hours_from_now = datetime.utcnow() + timedelta(hours=2)
    assert reset_user.password_reset_expires <= two_hours_from_now, (
        "password_reset_expires should be within 2 hours from now"
    )


def test_reset_password_returns_200_with_valid_token(client, db, reset_user):
    """A valid token + new password combination must return 200."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)
    token = reset_user.password_reset_token

    r = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword1!"},
    )
    assert r.status_code == 200


def test_reset_password_clears_token_after_use(client, db, reset_user):
    """After a successful reset, the token column must be NULL."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)
    token = reset_user.password_reset_token

    client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword1!"},
    )
    db.refresh(reset_user)
    assert reset_user.password_reset_token is None, (
        "password_reset_token must be cleared after successful reset"
    )


def test_reset_password_changes_the_hash(client, db, reset_user):
    """After reset, the hashed_password column must differ from the original."""
    original_hash = reset_user.hashed_password

    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)
    token = reset_user.password_reset_token

    client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword1!"},
    )
    db.refresh(reset_user)
    assert reset_user.hashed_password != original_hash, (
        "hashed_password must change after a successful password reset"
    )


def test_login_succeeds_with_new_password_after_reset(client, db, reset_user):
    """After reset, login with the new password must return 200 and a token."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)
    token = reset_user.password_reset_token

    client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword1!"},
    )

    r = client.post(
        "/api/v1/auth/login",
        json={"email": reset_user.email, "password": "NewPassword1!"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_fails_with_old_password_after_reset(client, db, reset_user):
    """After reset, login with the old password must return 401."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)
    token = reset_user.password_reset_token

    client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword1!"},
    )

    r = client.post(
        "/api/v1/auth/login",
        json={"email": reset_user.email, "password": "OldPassword1!"},
    )
    assert r.status_code == 401


def test_reuse_of_same_token_returns_400(client, db, reset_user):
    """After the token has been used once, using it again must return 400."""
    client.post("/api/v1/auth/forgot-password", json={"email": reset_user.email})
    db.refresh(reset_user)
    token = reset_user.password_reset_token

    # First use — must succeed
    r1 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword1!"},
    )
    assert r1.status_code == 200

    # Second use of the same token — must be rejected
    r2 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherPass1!"},
    )
    assert r2.status_code == 400, (
        "A token that has already been used must be rejected with 400"
    )
