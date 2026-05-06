"""
API tests for assessment endpoints:
  POST /api/v1/diabetes-assessment
  POST /api/v1/heart-assessment
  POST /api/v1/ckd-assessment
"""

import pytest


# Re-use canonical payloads from conftest
pytestmark = pytest.mark.usefixtures("regular_user")


# ── Diabetes assessment ───────────────────────────────────────────────────────

def test_diabetes_assessment_anonymous_returns_200(client, VALID_DIABETES):
    r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES)
    assert r.status_code == 200


def test_diabetes_assessment_response_shape(client, VALID_DIABETES):
    r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES)
    body = r.json()
    required_keys = {"assessment_id", "timestamp", "executive_summary", "risk_analysis", "health_metrics", "recommendations"}
    assert required_keys.issubset(body.keys())


def test_diabetes_assessment_authenticated_saves_to_db(client, auth_headers, VALID_DIABETES):
    r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=auth_headers)
    assert r.status_code == 200
    hist = client.get("/api/v1/users/me/assessments", headers=auth_headers)
    assert len(hist.json()) == 1


def test_diabetes_assessment_missing_glucose_returns_422(client):
    payload = {
        "blood_pressure": 80.0, "weight": 75.0, "height": 170.0, "age": 35
    }
    r = client.post("/api/v1/diabetes-assessment", json=payload)
    assert r.status_code == 422


def test_diabetes_assessment_missing_weight_returns_422(client):
    payload = {
        "glucose": 120.0, "blood_pressure": 80.0, "height": 170.0, "age": 35
    }
    r = client.post("/api/v1/diabetes-assessment", json=payload)
    assert r.status_code == 422


def test_diabetes_assessment_risk_analysis_has_probability(client, VALID_DIABETES):
    r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES)
    assert "probability" in r.json()["risk_analysis"]


def test_diabetes_assessment_health_metrics_has_bmi(client, VALID_DIABETES):
    r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES)
    assert "bmi" in r.json()["health_metrics"]


# ── Heart assessment ──────────────────────────────────────────────────────────

def test_heart_assessment_returns_200(client, VALID_HEART):
    r = client.post("/api/v1/heart-assessment", json=VALID_HEART)
    assert r.status_code == 200


def test_heart_assessment_response_has_assessment_id(client, VALID_HEART):
    r = client.post("/api/v1/heart-assessment", json=VALID_HEART)
    assert "assessment_id" in r.json()


def test_heart_assessment_authenticated_saves(client, auth_headers, VALID_HEART):
    r = client.post("/api/v1/heart-assessment", json=VALID_HEART, headers=auth_headers)
    assert r.status_code == 200
    hist = client.get("/api/v1/users/me/heart-assessments", headers=auth_headers)
    assert len(hist.json()) == 1


def test_heart_assessment_missing_age_returns_422(client):
    payload = {k: v for k, v in {
        "sex": 1, "cp": 1, "trestbps": 130, "chol": 250,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
        "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 3,
    }.items()}
    r = client.post("/api/v1/heart-assessment", json=payload)
    assert r.status_code == 422


def test_heart_assessment_response_keys(client, VALID_HEART):
    body = client.post("/api/v1/heart-assessment", json=VALID_HEART).json()
    required = {"assessment_id", "timestamp", "executive_summary", "risk_analysis", "recommendations"}
    assert required.issubset(body.keys())


# ── CKD assessment ────────────────────────────────────────────────────────────

def test_ckd_assessment_returns_200(client, VALID_CKD):
    r = client.post("/api/v1/ckd-assessment", json=VALID_CKD)
    assert r.status_code == 200


def test_ckd_assessment_response_has_prediction(client, VALID_CKD):
    body = client.post("/api/v1/ckd-assessment", json=VALID_CKD).json()
    assert "prediction" in body
    assert body["prediction"] in ("CKD", "No CKD")


def test_ckd_assessment_authenticated_saves(client, auth_headers, VALID_CKD):
    r = client.post("/api/v1/ckd-assessment", json=VALID_CKD, headers=auth_headers)
    assert r.status_code == 200
    hist = client.get("/api/v1/users/me/ckd-assessments", headers=auth_headers)
    assert len(hist.json()) == 1


def test_ckd_assessment_missing_age_returns_422(client):
    payload = {k: v for k, v in {
        "blood_pressure": 80.0, "serum_creatinine": 1.0,
        "hemoglobin": 13.0, "blood_urea": 25.0,
    }.items()}
    r = client.post("/api/v1/ckd-assessment", json=payload)
    assert r.status_code == 422


def test_ckd_assessment_confidence_between_0_and_1(client, VALID_CKD):
    body = client.post("/api/v1/ckd-assessment", json=VALID_CKD).json()
    assert 0.0 <= body["confidence"] <= 1.0


# ── DELETE /users/me/assessments/{id} ─────────────────────────────────────────

def test_delete_assessment_removes_from_history(client, auth_headers, VALID_DIABETES):
    post_r = client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=auth_headers)
    assert post_r.status_code == 200
    hist = client.get("/api/v1/users/me/assessments", headers=auth_headers).json()
    assert len(hist) == 1
    record_id = hist[0]["id"]
    del_r = client.delete(f"/api/v1/users/me/assessments/{record_id}", headers=auth_headers)
    assert del_r.status_code == 200
    hist_after = client.get("/api/v1/users/me/assessments", headers=auth_headers).json()
    assert len(hist_after) == 0


# ── Fixtures for request bodies (injected from conftest via globals) ──────────

@pytest.fixture
def VALID_DIABETES():
    return {
        "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
        "height": 170.0, "age": 35, "pregnancies": 0,
        "skin_thickness": 20.0, "insulin": 80.0,
        "diabetes_pedigree_function": 0.5, "language": "english",
    }


@pytest.fixture
def VALID_HEART():
    return {
        "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
        "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 3, "language": "english",
    }


@pytest.fixture
def VALID_CKD():
    return {
        "age": 45.0, "blood_pressure": 80.0, "specific_gravity": 1.020,
        "albumin": 0, "sugar": 0, "red_blood_cells": 0, "pus_cell": 0,
        "pus_cell_clumps": 0, "bacteria": 0, "blood_glucose_random": 120.0,
        "blood_urea": 25.0, "serum_creatinine": 1.0, "sodium": 140.0,
        "potassium": 4.5, "hemoglobin": 13.0, "packed_cell_volume": 40.0,
        "white_blood_cell_count": 7800.0, "red_blood_cell_count": 5.0,
        "hypertension": 0, "diabetes_mellitus": 0, "coronary_artery_disease": 0,
        "appetite": 1, "pedal_edema": 0, "anemia": 0, "language": "english",
    }
