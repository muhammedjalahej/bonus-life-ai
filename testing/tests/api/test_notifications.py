"""
GAP 5 — Notifications full lifecycle.

Tests cover: empty list for new user, mark-read, cross-user 404, read-all,
delete, cross-user delete, and 401 without token.
Notifications are created directly via the Notification ORM model.
"""

import pytest
from app.db_models import Notification


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_notif(db, user_id, title="Test", message="Test message", notif_type="info"):
    n = Notification(user_id=user_id, title=title, message=message, type=notif_type)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


# ─── GET /users/me/notifications ─────────────────────────────────────────────

def test_notifications_empty_for_new_user(client, regular_user, auth_headers):
    r = client.get("/api/v1/users/me/notifications", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_notifications_lists_users_own_notifications(client, db, regular_user, auth_headers):
    _make_notif(db, regular_user.id, title="Hello")
    r = client.get("/api/v1/users/me/notifications", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["title"] == "Hello"


def test_notifications_requires_auth(client):
    r = client.get("/api/v1/users/me/notifications")
    assert r.status_code == 401


# ─── POST /users/me/notifications/{id}/read ──────────────────────────────────

def test_mark_notification_read(client, db, regular_user, auth_headers):
    n = _make_notif(db, regular_user.id, title="Unread")
    assert n.is_read is False

    r = client.post(f"/api/v1/users/me/notifications/{n.id}/read", headers=auth_headers)
    assert r.status_code == 200

    # Verify the flag was actually set in the DB
    db.refresh(n)
    assert n.is_read is True


def test_mark_read_on_other_users_notification_returns_404(client, db, regular_user, auth_headers, admin_user):
    # Create a notification belonging to admin_user, not regular_user
    n = _make_notif(db, admin_user.id, title="Admin notif")

    r = client.post(f"/api/v1/users/me/notifications/{n.id}/read", headers=auth_headers)
    assert r.status_code == 404


def test_mark_read_nonexistent_notification_returns_404(client, regular_user, auth_headers):
    r = client.post("/api/v1/users/me/notifications/999999/read", headers=auth_headers)
    assert r.status_code == 404


def test_mark_read_requires_auth(client):
    r = client.post("/api/v1/users/me/notifications/1/read")
    assert r.status_code == 401


# ─── POST /users/me/notifications/read-all ───────────────────────────────────

def test_read_all_marks_all_notifications(client, db, regular_user, auth_headers):
    _make_notif(db, regular_user.id, title="A")
    _make_notif(db, regular_user.id, title="B")
    _make_notif(db, regular_user.id, title="C")

    r = client.post("/api/v1/users/me/notifications/read-all", headers=auth_headers)
    assert r.status_code == 200

    # All notifications should now have is_read = True
    r2 = client.get("/api/v1/users/me/notifications", headers=auth_headers)
    assert r2.status_code == 200
    for notif in r2.json():
        assert notif["is_read"] is True


def test_read_all_requires_auth(client):
    r = client.post("/api/v1/users/me/notifications/read-all")
    assert r.status_code == 401


# ─── DELETE /users/me/notifications/{id} ─────────────────────────────────────

def test_delete_notification(client, db, regular_user, auth_headers):
    n = _make_notif(db, regular_user.id, title="Delete me")

    r = client.delete(f"/api/v1/users/me/notifications/{n.id}", headers=auth_headers)
    assert r.status_code in (200, 204)

    # Notification should be gone from subsequent GET
    r2 = client.get("/api/v1/users/me/notifications", headers=auth_headers)
    ids = [x["id"] for x in r2.json()]
    assert n.id not in ids


def test_delete_other_users_notification_returns_404(client, db, regular_user, auth_headers, admin_user):
    n = _make_notif(db, admin_user.id, title="Admin private")

    r = client.delete(f"/api/v1/users/me/notifications/{n.id}", headers=auth_headers)
    assert r.status_code == 404


def test_delete_requires_auth(client):
    r = client.delete("/api/v1/users/me/notifications/1")
    assert r.status_code == 401
