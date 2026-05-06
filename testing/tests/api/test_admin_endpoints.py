"""
API tests for /api/v1/admin/* routes.
Covers RBAC enforcement, CRUD operations, announcements, settings, and system health.
"""

import pytest

from app.db_models import User, Announcement
from app.auth import hash_password


# ── RBAC: admin-only access ───────────────────────────────────────────────────

def test_admin_users_list_no_token_returns_401(client):
    r = client.get("/api/v1/admin/users")
    assert r.status_code == 401


def test_admin_users_list_regular_user_returns_403(client, auth_headers, regular_user):
    r = client.get("/api/v1/admin/users", headers=auth_headers)
    assert r.status_code == 403


def test_admin_users_list_admin_returns_200(client, admin_headers, admin_user):
    r = client.get("/api/v1/admin/users", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_stats_regular_user_returns_403(client, auth_headers, regular_user):
    r = client.get("/api/v1/admin/stats", headers=auth_headers)
    assert r.status_code == 403


def test_admin_system_health_no_token_returns_401(client):
    r = client.get("/api/v1/admin/system-health")
    assert r.status_code == 401


# ── GET /admin/system-health ──────────────────────────────────────────────────

def test_admin_system_health_returns_db_ok_true(client, admin_headers, admin_user):
    r = client.get("/api/v1/admin/system-health", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["services"]["Database"] is True
    assert "status" in body


def test_admin_system_health_includes_api_status(client, admin_headers, admin_user):
    body = client.get("/api/v1/admin/system-health", headers=admin_headers).json()
    assert "API" in body["services"]
    assert body["services"]["API"] is True


# ── POST /admin/users (create) ────────────────────────────────────────────────

def test_admin_create_user(client, admin_headers, admin_user):
    r = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "created@example.com",
        "password": "Password123!",
        "full_name": "Created By Admin",
        "role": "user",
    })
    assert r.status_code == 200
    assert "user" in r.json()
    assert r.json()["user"]["email"] == "created@example.com"


def test_admin_create_user_duplicate_email_returns_400(client, admin_headers, admin_user, regular_user):
    r = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "testuser@example.com",  # already exists
        "password": "Password123!",
        "role": "user",
    })
    assert r.status_code == 400


def test_admin_create_user_invalid_role_returns_400(client, admin_headers, admin_user):
    r = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "badrole@example.com",
        "password": "Password123!",
        "role": "superuser",
    })
    assert r.status_code == 400


# ── PATCH /admin/users/{id} ───────────────────────────────────────────────────

def test_admin_update_user_role(client, admin_headers, admin_user, regular_user):
    r = client.patch(f"/api/v1/admin/users/{regular_user.id}", headers=admin_headers,
                     json={"role": "admin"})
    assert r.status_code == 200


def test_admin_update_user_deactivate(client, admin_headers, admin_user, regular_user):
    r = client.patch(f"/api/v1/admin/users/{regular_user.id}", headers=admin_headers,
                     json={"is_active": False})
    assert r.status_code == 200


def test_admin_cannot_change_own_role(client, admin_headers, admin_user):
    r = client.patch(f"/api/v1/admin/users/{admin_user.id}", headers=admin_headers,
                     json={"role": "user"})
    assert r.status_code == 400


# ── DELETE /admin/users/{id} ──────────────────────────────────────────────────

def test_admin_delete_user(client, admin_headers, admin_user, db):
    target = User(email="todelete@example.com", hashed_password=hash_password("pw"), role="user")
    db.add(target)
    db.commit()
    db.refresh(target)
    r = client.delete(f"/api/v1/admin/users/{target.id}", headers=admin_headers)
    assert r.status_code == 200


def test_admin_delete_nonexistent_user_returns_404(client, admin_headers, admin_user):
    r = client.delete("/api/v1/admin/users/99999", headers=admin_headers)
    assert r.status_code == 404


# ── Announcements CRUD ────────────────────────────────────────────────────────

def test_admin_create_announcement(client, admin_headers, admin_user):
    r = client.post("/api/v1/admin/announcements", headers=admin_headers, json={
        "title": "Maintenance Tonight",
        "message": "Server will be down at midnight.",
        "is_active": True,
    })
    assert r.status_code == 200
    assert "id" in r.json()


def test_admin_create_announcement_invalid_expires_at_returns_400(client, admin_headers, admin_user):
    r = client.post("/api/v1/admin/announcements", headers=admin_headers, json={
        "title": "Test",
        "message": "Test",
        "expires_at": "next tuesday",
    })
    assert r.status_code == 400
    assert "expires_at" in r.json()["detail"].lower() or "ISO" in r.json()["detail"]


def test_admin_create_announcement_valid_expires_at(client, admin_headers, admin_user):
    r = client.post("/api/v1/admin/announcements", headers=admin_headers, json={
        "title": "Limited",
        "message": "Expires soon.",
        "expires_at": "2099-12-31T23:59:00",
    })
    assert r.status_code == 200


def test_admin_list_announcements(client, admin_headers, admin_user):
    r = client.get("/api/v1/admin/announcements", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_update_announcement(client, admin_headers, admin_user, db):
    ann = Announcement(title="Old", message="Old msg", is_active=True, created_by=admin_user.id)
    db.add(ann)
    db.commit()
    db.refresh(ann)

    r = client.patch(f"/api/v1/admin/announcements/{ann.id}", headers=admin_headers, json={
        "title": "Updated",
        "message": "New msg",
        "is_active": True,
    })
    assert r.status_code == 200


def test_admin_delete_announcement(client, admin_headers, admin_user, db):
    ann = Announcement(title="To Delete", message="bye", is_active=True, created_by=admin_user.id)
    db.add(ann)
    db.commit()
    db.refresh(ann)

    r = client.delete(f"/api/v1/admin/announcements/{ann.id}", headers=admin_headers)
    assert r.status_code == 200


# ── Site settings ─────────────────────────────────────────────────────────────

def test_admin_get_settings_returns_defaults(client, admin_headers, admin_user):
    r = client.get("/api/v1/admin/settings", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "maintenance_mode" in body
    assert "allow_signups" in body


def test_admin_update_valid_setting(client, admin_headers, admin_user):
    r = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "maintenance_mode",
        "value": "false",
    })
    assert r.status_code == 200


def test_admin_update_invalid_setting_key_returns_400(client, admin_headers, admin_user):
    r = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "unknown_setting_key",
        "value": "true",
    })
    assert r.status_code == 400
    assert "Unknown setting key" in r.json()["detail"] or "Allowed" in r.json()["detail"]


# ── Audit log ─────────────────────────────────────────────────────────────────

def test_admin_get_audit_log(client, admin_headers, admin_user):
    r = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_audit_log_no_auth_returns_401(client):
    r = client.get("/api/v1/admin/audit-log")
    assert r.status_code == 401
