"""API tests for public (no-auth) endpoints."""

from datetime import datetime, timedelta

import pytest

from app.db_models import Announcement, Assessment, User
from app.auth import hash_password


# ── GET /auth/maintenance-status ─────────────────────────────────────────────

def test_maintenance_status_returns_200(client):
    r = client.get("/api/v1/auth/maintenance-status")
    assert r.status_code == 200
    body = r.json()
    assert "maintenance" in body
    assert "allow_signups" in body


def test_maintenance_status_defaults_to_false(client):
    r = client.get("/api/v1/auth/maintenance-status")
    assert r.json()["maintenance"] is False


def test_signups_allowed_default_true(client):
    r = client.get("/api/v1/auth/maintenance-status")
    assert r.json()["allow_signups"] is True


# ── GET /announcements/active ─────────────────────────────────────────────────

def test_active_announcements_returns_list(client):
    r = client.get("/api/v1/announcements/active")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_active_announcements_no_auth_needed(client):
    """Confirm public access — no auth header sent."""
    r = client.get("/api/v1/announcements/active")
    assert r.status_code == 200


def test_active_announcement_appears_in_list(client, db, admin_user):
    ann = Announcement(
        title="Live News",
        message="Something important happened.",
        is_active=True,
        created_by=admin_user.id,
        expires_at=None,
    )
    db.add(ann)
    db.commit()

    r = client.get("/api/v1/announcements/active")
    items = r.json()
    assert any(a["title"] == "Live News" for a in items)


def test_inactive_announcement_not_in_active_list(client, db, admin_user):
    ann = Announcement(
        title="Inactive Notice",
        message="Should not appear.",
        is_active=False,
        created_by=admin_user.id,
    )
    db.add(ann)
    db.commit()

    r = client.get("/api/v1/announcements/active")
    items = r.json()
    assert not any(a["title"] == "Inactive Notice" for a in items)


def test_expired_announcement_not_in_active_list(client, db, admin_user):
    ann = Announcement(
        title="Old News",
        message="This expired.",
        is_active=True,
        created_by=admin_user.id,
        expires_at=datetime.utcnow() - timedelta(hours=1),
    )
    db.add(ann)
    db.commit()

    r = client.get("/api/v1/announcements/active")
    items = r.json()
    assert not any(a["title"] == "Old News" for a in items)


def test_future_expires_at_announcement_appears(client, db, admin_user):
    ann = Announcement(
        title="Future Expiry",
        message="Still valid.",
        is_active=True,
        created_by=admin_user.id,
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db.add(ann)
    db.commit()

    r = client.get("/api/v1/announcements/active")
    items = r.json()
    assert any(a["title"] == "Future Expiry" for a in items)


# ── GET /shared/assessment/{token} ───────────────────────────────────────────

def test_shared_assessment_invalid_token_returns_404(client):
    r = client.get("/api/v1/shared/assessment/nonexistent-token")
    assert r.status_code == 404


def test_shared_assessment_valid_token_returns_data(client, db):
    user = User(email="sharer@example.com", hashed_password=hash_password("pw"), role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    import uuid, json
    a = Assessment(
        user_id=user.id,
        assessment_id=str(uuid.uuid4()),
        risk_level="Low Risk",
        probability=0.12,
        executive_summary="All clear.",
        payload=json.dumps({"glucose": 90}),
        share_token="unique-share-token-abc123",
    )
    db.add(a)
    db.commit()

    r = client.get("/api/v1/shared/assessment/unique-share-token-abc123")
    assert r.status_code == 200
    body = r.json()
    assert body["risk_level"] == "Low Risk"
    assert "executive_summary" in body


def test_shared_assessment_response_has_no_private_fields(client, db):
    user = User(email="priv@example.com", hashed_password=hash_password("pw"), role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    import uuid, json
    a = Assessment(
        user_id=user.id,
        assessment_id=str(uuid.uuid4()),
        risk_level="Low Risk",
        probability=0.1,
        share_token="privacy-test-token",
        payload=json.dumps({}),
    )
    db.add(a)
    db.commit()

    r = client.get("/api/v1/shared/assessment/privacy-test-token")
    body = r.json()
    assert "hashed_password" not in body
    assert "totp_secret" not in body
