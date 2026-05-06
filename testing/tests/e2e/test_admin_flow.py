"""
E2E tests: complete admin management flows through the API.
"""

import pytest


# ── Flow 1: Admin login → manage users → deactivate → delete ─────────────────

def test_e2e_admin_user_lifecycle(client, admin_user, admin_headers):
    # 1. Create a user via admin
    create = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "managed_user@example.com",
        "password": "Password123!",
        "full_name": "Managed User",
        "role": "user",
    })
    assert create.status_code == 200
    user_id = create.json()["user"]["id"]

    # 2. List users and verify user appears
    users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert any(u["id"] == user_id for u in users.json())

    # 3. Deactivate the user
    deact = client.patch(f"/api/v1/admin/users/{user_id}", headers=admin_headers,
                         json={"is_active": False})
    assert deact.status_code == 200

    # 4. Deactivated user cannot login
    login = client.post("/api/v1/auth/login", json={
        "email": "managed_user@example.com",
        "password": "Password123!",
    })
    assert login.status_code == 403

    # 5. Re-activate
    react = client.patch(f"/api/v1/admin/users/{user_id}", headers=admin_headers,
                         json={"is_active": True})
    assert react.status_code == 200

    # 6. Delete the user
    delete = client.delete(f"/api/v1/admin/users/{user_id}", headers=admin_headers)
    assert delete.status_code == 200


# ── Flow 2: Admin manages announcements lifecycle ─────────────────────────────

def test_e2e_admin_announcement_lifecycle(client, admin_user, admin_headers):
    # 1. Create announcement
    create = client.post("/api/v1/admin/announcements", headers=admin_headers, json={
        "title": "System Update",
        "message": "New features are live!",
        "is_active": True,
    })
    assert create.status_code == 200
    ann_id = create.json()["id"]

    # 2. Active announcement appears publicly
    public = client.get("/api/v1/announcements/active")
    assert any(a["id"] == ann_id for a in public.json())

    # 3. Deactivate the announcement
    update = client.patch(f"/api/v1/admin/announcements/{ann_id}", headers=admin_headers, json={
        "title": "System Update",
        "message": "New features are live!",
        "is_active": False,
    })
    assert update.status_code == 200

    # 4. Deactivated announcement no longer appears publicly
    public_after = client.get("/api/v1/announcements/active")
    assert not any(a["id"] == ann_id for a in public_after.json())

    # 5. Delete the announcement
    delete = client.delete(f"/api/v1/admin/announcements/{ann_id}", headers=admin_headers)
    assert delete.status_code == 200

    # 6. Admin list no longer contains the announcement
    admin_list = client.get("/api/v1/admin/announcements", headers=admin_headers)
    assert not any(a["id"] == ann_id for a in admin_list.json())


# ── Flow 3: Admin views platform stats and system health ─────────────────────

def test_e2e_admin_dashboard_overview(client, admin_user, admin_headers):
    # 1. Check system health
    health = client.get("/api/v1/admin/system-health", headers=admin_headers)
    assert health.status_code == 200
    assert health.json()["services"]["Database"] is True

    # 2. Check audit log (admin actions should be recorded)
    audit = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert audit.status_code == 200
    assert isinstance(audit.json(), list)


# ── Flow 4: Admin soft-deletes an assessment record ──────────────────────────

def test_e2e_admin_soft_delete_assessment(client, admin_headers, admin_user):
    # 1. Create a user with an assessment
    create_user = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "assessed_user@example.com",
        "password": "Password123!",
        "role": "user",
    })
    assert create_user.status_code == 200
    user_id = create_user.json()["user"]["id"]

    # Login as the created user and run an assessment
    login = client.post("/api/v1/auth/login", json={
        "email": "assessed_user@example.com",
        "password": "Password123!",
    })
    assert login.status_code == 200
    user_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assess = client.post("/api/v1/diabetes-assessment", json={
        "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
        "height": 170.0, "age": 35, "pregnancies": 0,
        "skin_thickness": 20.0, "insulin": 80.0,
        "diabetes_pedigree_function": 0.5, "language": "english",
    }, headers=user_headers)
    assert assess.status_code == 200

    # 2. Admin can see the assessment
    admin_list = client.get("/api/v1/admin/assessments", headers=admin_headers)
    assert admin_list.status_code == 200
    records = admin_list.json()
    assert len(records) >= 1

    # 3. Admin soft-deletes it
    record_id = records[0]["id"]
    soft_del = client.delete(f"/api/v1/admin/assessments/{record_id}", headers=admin_headers)
    assert soft_del.status_code == 200

    # 4. Admin list no longer shows it (admin_hidden=True)
    admin_list_after = client.get("/api/v1/admin/assessments", headers=admin_headers)
    ids_after = [r["id"] for r in admin_list_after.json()]
    assert record_id not in ids_after


# ── Flow 5: Admin changes site settings and effect is reflected ───────────────

def test_e2e_admin_settings_affect_signup(client, admin_user, admin_headers):
    # 1. Disable signups
    disable = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "allow_signups",
        "value": "false",
    })
    assert disable.status_code == 200

    # 2. Registration attempt is rejected
    reg = client.post("/api/v1/auth/register", json={
        "email": "blocked_registration@example.com",
        "password": "Password123!",
    })
    assert reg.status_code in (403, 503)

    # 3. Re-enable signups
    enable = client.patch("/api/v1/admin/settings", headers=admin_headers, json={
        "key": "allow_signups",
        "value": "true",
    })
    assert enable.status_code == 200

    # 4. Registration now succeeds
    reg2 = client.post("/api/v1/auth/register", json={
        "email": "unblocked@example.com",
        "password": "Password123!",
    })
    assert reg2.status_code == 200
