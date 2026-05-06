"""
GAP 8 — Audit log content correctness.

Tests verify: auth enforcement, that admin actions produce log entries,
the shape of each log entry, and that the logged admin email matches the
admin who performed the action.

Note: the GET /admin/audit-log response exposes `admin_email` (not `admin_id`
directly). Tests validate the `admin_email` field as the authoritative
"who performed the action" identifier, since `admin_id` lives in the DB row
but is not returned by the list endpoint.
"""

import pytest
from app.db_models import AuditLog


# ─── Auth enforcement ─────────────────────────────────────────────────────────

def test_audit_log_requires_auth(client):
    r = client.get("/api/v1/admin/audit-log")
    assert r.status_code == 401


def test_audit_log_blocks_regular_user(client, regular_user, auth_headers):
    r = client.get("/api/v1/admin/audit-log", headers=auth_headers)
    assert r.status_code == 403


def test_audit_log_accessible_to_admin(client, admin_user, admin_headers):
    r = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ─── Admin actions produce log entries ───────────────────────────────────────

def test_create_user_produces_audit_log_entry(client, db, admin_user, admin_headers):
    """Creating a user via the admin panel must generate an audit log entry."""
    # Record baseline count
    before = db.query(AuditLog).count()

    client.post(
        "/api/v1/admin/users",
        json={"email": "newaudituser@example.com", "password": "Password123!", "role": "user"},
        headers=admin_headers,
    )

    after = db.query(AuditLog).count()
    assert after > before, "POST /admin/users must create at least one audit log entry"


def test_deactivate_user_produces_audit_log_entry(client, db, admin_user, admin_headers, regular_user):
    """Deactivating a user must generate an audit log entry."""
    before = db.query(AuditLog).count()

    client.patch(
        f"/api/v1/admin/users/{regular_user.id}",
        json={"is_active": False},
        headers=admin_headers,
    )

    after = db.query(AuditLog).count()
    assert after > before, "PATCH /admin/users/{id} must create at least one audit log entry"


def test_delete_user_produces_audit_log_entry(client, db, admin_user, admin_headers, regular_user):
    """Deleting a user must generate an audit log entry."""
    before = db.query(AuditLog).count()

    client.delete(f"/api/v1/admin/users/{regular_user.id}", headers=admin_headers)

    after = db.query(AuditLog).count()
    assert after > before, "DELETE /admin/users/{id} must create at least one audit log entry"


# ─── Audit entry field shape ──────────────────────────────────────────────────

def test_audit_log_entry_has_required_fields(client, db, admin_user, admin_headers):
    """Each audit log entry returned by the API must have action and created_at."""
    # Generate a known action
    client.post(
        "/api/v1/admin/users",
        json={"email": "fieldcheck@example.com", "password": "Password123!", "role": "user"},
        headers=admin_headers,
    )

    r = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert r.status_code == 200
    entries = r.json()
    assert len(entries) > 0

    entry = entries[0]
    assert "action" in entry, "audit log entry must have 'action' field"
    assert "created_at" in entry, "audit log entry must have 'created_at' field"
    assert entry["action"] is not None
    assert entry["created_at"] is not None


def test_audit_log_entry_admin_email_is_not_null(client, db, admin_user, admin_headers):
    """The admin_email field must identify who performed the action."""
    client.post(
        "/api/v1/admin/users",
        json={"email": "emailcheck@example.com", "password": "Password123!", "role": "user"},
        headers=admin_headers,
    )

    r = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    entries = r.json()
    assert len(entries) > 0
    entry = entries[0]
    assert "admin_email" in entry
    assert entry["admin_email"] is not None and entry["admin_email"] != ""


def test_audit_log_admin_email_matches_performing_admin(client, db, admin_user, admin_headers, regular_user):
    """The admin_email in the log must match the email of the admin who acted."""
    client.patch(
        f"/api/v1/admin/users/{regular_user.id}",
        json={"is_active": False},
        headers=admin_headers,
    )

    r = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    entries = r.json()
    assert len(entries) > 0

    # The most recent entry should reference the admin's email
    assert entries[0]["admin_email"] == admin_user.email, (
        f"Expected admin_email={admin_user.email!r}, got {entries[0]['admin_email']!r}"
    )
