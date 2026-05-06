"""
E2E tests: complete user flows exercised through the API.

Each test represents a realistic user journey from start to finish:
  1. Register / login
  2. Run an assessment
  3. Verify results saved to history
  4. Share / delete / export
"""

import pytest


DIABETES_PAYLOAD = {
    "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
    "height": 170.0, "age": 35, "pregnancies": 0,
    "skin_thickness": 20.0, "insulin": 80.0,
    "diabetes_pedigree_function": 0.5, "language": "english",
}

HEART_PAYLOAD = {
    "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250,
    "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
    "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 3, "language": "english",
}

CKD_PAYLOAD = {
    "age": 45.0, "blood_pressure": 80.0, "specific_gravity": 1.020,
    "albumin": 0, "sugar": 0, "red_blood_cells": 0, "pus_cell": 0,
    "pus_cell_clumps": 0, "bacteria": 0, "blood_glucose_random": 120.0,
    "blood_urea": 25.0, "serum_creatinine": 1.0, "sodium": 140.0,
    "potassium": 4.5, "hemoglobin": 13.0, "packed_cell_volume": 40.0,
    "white_blood_cell_count": 7800.0, "red_blood_cell_count": 5.0,
    "hypertension": 0, "diabetes_mellitus": 0, "coronary_artery_disease": 0,
    "appetite": 1, "pedal_edema": 0, "anemia": 0, "language": "english",
}


# ── Flow 1: Register → Login → Run assessment → View history → Delete ─────────

def test_e2e_register_login_assess_view_delete(client):
    # 1. Register
    reg = client.post("/api/v1/auth/register", json={
        "email": "e2e_user@example.com",
        "password": "E2ePassword1!",
        "full_name": "E2E User",
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Run diabetes assessment
    assess = client.post("/api/v1/diabetes-assessment", json=DIABETES_PAYLOAD, headers=headers)
    assert assess.status_code == 200
    assert "assessment_id" in assess.json()

    # 3. View assessment history
    history = client.get("/api/v1/users/me/assessments", headers=headers)
    assert history.status_code == 200
    records = history.json()
    assert len(records) == 1

    # 4. Delete the assessment
    record_id = records[0]["id"]
    delete = client.delete(f"/api/v1/users/me/assessments/{record_id}", headers=headers)
    assert delete.status_code == 200

    # 5. History is now empty
    after_delete = client.get("/api/v1/users/me/assessments", headers=headers)
    assert len(after_delete.json()) == 0


# ── Flow 2: Register → Run heart assessment → Generate share link → Access ────

def test_e2e_heart_assessment_share_flow(client):
    # 1. Register
    reg = client.post("/api/v1/auth/register", json={
        "email": "share_user@example.com",
        "password": "SharePass123!",
    })
    assert reg.status_code == 200
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 2. Run heart assessment
    assess = client.post("/api/v1/heart-assessment", json=HEART_PAYLOAD, headers=headers)
    assert assess.status_code == 200

    # 3. Get the saved record to find its DB id
    history = client.get("/api/v1/users/me/heart-assessments", headers=headers)
    assert len(history.json()) == 1
    record_id = history.json()[0]["id"]

    # 4. Generate share link
    share = client.post(f"/api/v1/users/me/heart-assessments/{record_id}/share", headers=headers)
    assert share.status_code == 200
    assert "share_token" in share.json() or "share_url" in share.json()

    # 5. Access shared view publicly (no auth)
    token_value = share.json().get("share_token") or share.json().get("share_url", "").split("/")[-1]
    if token_value:
        public = client.get(f"/api/v1/shared/heart/{token_value}")
        assert public.status_code == 200


# ── Flow 3: Register → Multiple assessments → Export data ─────────────────────

def test_e2e_multiple_assessments_export(client):
    # 1. Register
    reg = client.post("/api/v1/auth/register", json={
        "email": "export_user@example.com",
        "password": "ExportPass1!",
    })
    assert reg.status_code == 200
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 2. Run multiple assessments
    client.post("/api/v1/diabetes-assessment", json=DIABETES_PAYLOAD, headers=headers)
    client.post("/api/v1/heart-assessment", json=HEART_PAYLOAD, headers=headers)

    # 3. Verify both in history
    diab = client.get("/api/v1/users/me/assessments", headers=headers).json()
    heart = client.get("/api/v1/users/me/heart-assessments", headers=headers).json()
    assert len(diab) == 1
    assert len(heart) == 1

    # 4. Export all user data
    export = client.get("/api/v1/users/me/export", headers=headers)
    assert export.status_code == 200
    body = export.json()
    assert "user" in body or "assessments" in body


# ── Flow 4: Register → Update profile → Verify changes persist ───────────────

def test_e2e_profile_update_flow(client):
    # 1. Register
    reg = client.post("/api/v1/auth/register", json={
        "email": "profile_user@example.com",
        "password": "ProfilePass1!",
        "full_name": "Original Name",
    })
    assert reg.status_code == 200
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 2. Update full name and language
    update = client.patch("/api/v1/users/me", headers=headers, json={
        "full_name": "Updated Name",
        "preferred_language": "arabic",
    })
    assert update.status_code == 200

    # 3. Verify changes are persisted
    me = client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["full_name"] == "Updated Name"
    assert me.json()["preferred_language"] == "arabic"

    # 4. Change password
    change_pw = client.post("/api/v1/users/me/change-password", headers=headers, json={
        "current_password": "ProfilePass1!",
        "new_password": "NewProfilePass2!",
    })
    assert change_pw.status_code == 200

    # 5. Login with new password
    login = client.post("/api/v1/auth/login", json={
        "email": "profile_user@example.com",
        "password": "NewProfilePass2!",
    })
    assert login.status_code == 200


# ── Flow 5: CKD assessment with all comorbidities ─────────────────────────────

def test_e2e_ckd_assessment_high_risk(client):
    # 1. Register
    reg = client.post("/api/v1/auth/register", json={
        "email": "ckd_user@example.com",
        "password": "CkdPass123!",
    })
    assert reg.status_code == 200
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 2. Submit CKD with high-risk indicators
    high_risk_ckd = {**CKD_PAYLOAD, "serum_creatinine": 3.5, "hypertension": 1, "diabetes_mellitus": 1}
    r = client.post("/api/v1/ckd-assessment", json=high_risk_ckd, headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["confidence"] > 0

    # 3. Verify it appears in CKD history
    hist = client.get("/api/v1/users/me/ckd-assessments", headers=headers).json()
    assert len(hist) == 1
    assert hist[0]["prediction"] in ("CKD", "No CKD")
