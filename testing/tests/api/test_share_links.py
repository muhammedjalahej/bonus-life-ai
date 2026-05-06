"""
GAP 6 — Share link full coverage.

Tests cover: create diabetes/heart/CKD share links, access via public token,
revoke, post-revoke 404, invalid token 404, cross-user protection, and
public-endpoint no-auth requirement.
"""

import pytest
import uuid
from app.db_models import Assessment, HeartAssessment, CKDAssessment


# ─── Shared fixture: create one assessment of each type ──────────────────────

VALID_DIABETES = {
    "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
    "height": 170.0, "age": 35, "pregnancies": 0, "skin_thickness": 20.0,
    "insulin": 80.0, "diabetes_pedigree_function": 0.5, "language": "english",
}
VALID_HEART = {
    "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250, "fbs": 0,
    "restecg": 0, "thalach": 150, "exang": 0, "oldpeak": 1.0,
    "slope": 1, "ca": 0, "thal": 3, "language": "english",
}
VALID_CKD = {
    "age": 45.0, "blood_pressure": 80.0, "specific_gravity": 1.020,
    "albumin": 0, "sugar": 0, "red_blood_cells": 0, "pus_cell": 0,
    "pus_cell_clumps": 0, "bacteria": 0, "blood_glucose_random": 120.0,
    "blood_urea": 25.0, "serum_creatinine": 1.0, "sodium": 140.0,
    "potassium": 4.5, "hemoglobin": 13.0, "packed_cell_volume": 40.0,
    "white_blood_cell_count": 7800.0, "red_blood_cell_count": 5.0,
    "hypertension": 0, "diabetes_mellitus": 0, "coronary_artery_disease": 0,
    "appetite": 1, "pedal_edema": 0, "anemia": 0, "language": "english",
}


def _run_diabetes(client, headers):
    r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=headers)
    assert r.status_code == 200
    return r.json()["assessment_id"]


def _run_heart(client, headers):
    r = client.post("/api/v1/heart-assessment", json=VALID_HEART, headers=headers)
    assert r.status_code == 200
    return r.json()["assessment_id"]


def _run_ckd(client, headers):
    r = client.post("/api/v1/ckd-assessment", json=VALID_CKD, headers=headers)
    assert r.status_code == 200
    return r.json()["assessment_id"]


def _get_db_assessment_id(db, assessment_uuid):
    a = db.query(Assessment).filter(Assessment.assessment_id == assessment_uuid).first()
    return a.id if a else None


def _get_db_heart_id(db, assessment_uuid):
    a = db.query(HeartAssessment).filter(HeartAssessment.assessment_id == assessment_uuid).first()
    return a.id if a else None


def _get_db_ckd_id(db, assessment_uuid):
    a = db.query(CKDAssessment).filter(CKDAssessment.assessment_id == assessment_uuid).first()
    return a.id if a else None


# ─── Diabetes share link ──────────────────────────────────────────────────────

def test_create_share_link_returns_share_token(client, db, regular_user, auth_headers):
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()
    assert a is not None

    r = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    assert r.status_code == 200
    assert "share_token" in r.json()
    assert r.json()["share_token"] is not None


def test_share_token_stored_in_db(client, db, regular_user, auth_headers):
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()

    client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    db.refresh(a)
    assert a.share_token is not None
    assert len(a.share_token) > 0


def test_shared_assessment_public_access(client, db, regular_user, auth_headers):
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()

    r_share = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    token = r_share.json()["share_token"]

    # Public access — no auth header
    r_public = client.get(f"/api/v1/shared/assessment/{token}")
    assert r_public.status_code == 200


def test_shared_assessment_contains_required_fields(client, db, regular_user, auth_headers):
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()

    r_share = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    token = r_share.json()["share_token"]

    r_public = client.get(f"/api/v1/shared/assessment/{token}")
    data = r_public.json()
    assert "risk_level" in data
    assert "probability" in data
    assert "executive_summary" in data


def test_invalid_share_token_returns_404(client):
    r = client.get("/api/v1/shared/assessment/invalid-token-xyz-does-not-exist")
    assert r.status_code == 404


def test_revoke_share_clears_token_from_db(client, db, regular_user, auth_headers):
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()

    r_share = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    token = r_share.json()["share_token"]

    r_revoke = client.delete(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    assert r_revoke.status_code == 200

    db.refresh(a)
    assert a.share_token is None


def test_revoked_token_returns_404(client, db, regular_user, auth_headers):
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()

    r_share = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    token = r_share.json()["share_token"]

    client.delete(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)

    r_after = client.get(f"/api/v1/shared/assessment/{token}")
    assert r_after.status_code == 404


# ─── Heart share link ─────────────────────────────────────────────────────────

def test_heart_share_link_lifecycle(client, db, regular_user, auth_headers):
    _run_heart(client, auth_headers)
    a = db.query(HeartAssessment).filter(HeartAssessment.user_id == regular_user.id).first()
    assert a is not None

    r_share = client.post(f"/api/v1/users/me/heart-assessments/{a.id}/share", headers=auth_headers)
    assert r_share.status_code == 200
    token = r_share.json()["share_token"]

    r_public = client.get(f"/api/v1/shared/heart/{token}")
    assert r_public.status_code == 200
    data = r_public.json()
    assert "risk_level" in data
    assert "probability" in data
    assert "executive_summary" in data


# ─── CKD share link ───────────────────────────────────────────────────────────

def test_ckd_share_link_lifecycle(client, db, regular_user, auth_headers):
    _run_ckd(client, auth_headers)
    a = db.query(CKDAssessment).filter(CKDAssessment.user_id == regular_user.id).first()
    assert a is not None

    r_share = client.post(f"/api/v1/users/me/ckd-assessments/{a.id}/share", headers=auth_headers)
    assert r_share.status_code == 200
    token = r_share.json()["share_token"]

    r_public = client.get(f"/api/v1/shared/ckd/{token}")
    assert r_public.status_code == 200
    data = r_public.json()
    # CKD uses prediction/confidence instead of risk_level/probability
    assert "prediction" in data or "risk_level" in data or "confidence" in data


# ─── Cross-user protection ───────────────────────────────────────────────────

def test_sharing_another_users_assessment_returns_404(client, db, regular_user, auth_headers, admin_user, admin_headers):
    """regular_user cannot share an assessment that belongs to admin_user."""
    _run_diabetes(client, admin_headers)  # create assessment as admin
    a = db.query(Assessment).filter(Assessment.user_id == admin_user.id).first()
    assert a is not None

    r = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    assert r.status_code in (403, 404)


# ─── Public endpoint requires no auth ────────────────────────────────────────

def test_shared_assessment_accessible_without_auth(client, db, regular_user, auth_headers):
    """The shared view endpoint must be accessible without any JWT token."""
    _run_diabetes(client, auth_headers)
    a = db.query(Assessment).filter(Assessment.user_id == regular_user.id).first()

    r_share = client.post(f"/api/v1/users/me/assessments/{a.id}/share", headers=auth_headers)
    token = r_share.json()["share_token"]

    # Call without headers
    r_public = client.get(f"/api/v1/shared/assessment/{token}")
    assert r_public.status_code == 200
