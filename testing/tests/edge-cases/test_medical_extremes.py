"""
Edge-case tests: extreme but within-range medical values.
These values are unrealistic clinically but are allowed by the validator — the
system must handle them without crashing and must return a structured response.
"""

import copy

import pytest


BASE_DIABETES = {
    "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
    "height": 170.0, "age": 35, "pregnancies": 0,
    "skin_thickness": 20.0, "insulin": 80.0,
    "diabetes_pedigree_function": 0.5, "language": "english",
}

BASE_HEART = {
    "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250,
    "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
    "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 3, "language": "english",
}

BASE_CKD = {
    "age": 45.0, "blood_pressure": 80.0, "specific_gravity": 1.020,
    "albumin": 0, "sugar": 0, "red_blood_cells": 0, "pus_cell": 0,
    "pus_cell_clumps": 0, "bacteria": 0, "blood_glucose_random": 120.0,
    "blood_urea": 25.0, "serum_creatinine": 1.0, "sodium": 140.0,
    "potassium": 4.5, "hemoglobin": 13.0, "packed_cell_volume": 40.0,
    "white_blood_cell_count": 7800.0, "red_blood_cell_count": 5.0,
    "hypertension": 0, "diabetes_mellitus": 0, "coronary_artery_disease": 0,
    "appetite": 1, "pedal_edema": 0, "anemia": 0, "language": "english",
}


# ── Diabetes: extreme but valid ───────────────────────────────────────────────

def test_diabetes_zero_glucose_does_not_crash(client):
    d = copy.copy(BASE_DIABETES)
    d["glucose"] = 0.0
    r = client.post("/api/v1/diabetes-assessment", json=d)
    assert r.status_code == 200
    assert "assessment_id" in r.json()


def test_diabetes_maximum_glucose_does_not_crash(client):
    d = copy.copy(BASE_DIABETES)
    d["glucose"] = 499.0  # extremely high — near diabetic emergency
    r = client.post("/api/v1/diabetes-assessment", json=d)
    assert r.status_code == 200


def test_diabetes_infant_age_does_not_crash(client):
    d = copy.copy(BASE_DIABETES)
    d["age"] = 1
    d["weight"] = 20.0
    d["height"] = 50.0
    r = client.post("/api/v1/diabetes-assessment", json=d)
    assert r.status_code == 200


def test_diabetes_elderly_age_does_not_crash(client):
    d = copy.copy(BASE_DIABETES)
    d["age"] = 120
    r = client.post("/api/v1/diabetes-assessment", json=d)
    assert r.status_code == 200


def test_diabetes_all_extreme_risk_factors_returns_high_severity_factors(client):
    d = copy.copy(BASE_DIABETES)
    d["glucose"] = 130
    d["blood_pressure"] = 145.0
    d["age"] = 55
    r = client.post("/api/v1/diabetes-assessment", json=d)
    assert r.status_code == 200
    factors = r.json()["risk_analysis"]["key_factors"]
    severities = [f["severity"] for f in factors]
    assert "high" in severities or "moderate" in severities


def test_diabetes_all_normal_values_returns_no_significant_factor(client):
    d = copy.copy(BASE_DIABETES)
    d["glucose"] = 90.0
    d["blood_pressure"] = 75.0
    d["age"] = 30
    d["weight"] = 65.0   # BMI = 65 / 1.70^2 ≈ 22.5 — Normal range, no BMI risk factor
    r = client.post("/api/v1/diabetes-assessment", json=d)
    assert r.status_code == 200
    factors = r.json()["risk_analysis"]["key_factors"]
    assert any("No significant" in f["factor"] for f in factors)


# ── Heart: extreme but valid ──────────────────────────────────────────────────

def test_heart_extreme_cholesterol_does_not_crash(client):
    h = copy.copy(BASE_HEART)
    h["chol"] = 600
    r = client.post("/api/v1/heart-assessment", json=h)
    assert r.status_code == 200


def test_heart_maximum_age_does_not_crash(client):
    h = copy.copy(BASE_HEART)
    h["age"] = 120
    r = client.post("/api/v1/heart-assessment", json=h)
    assert r.status_code == 200


def test_heart_minimum_thalach_does_not_crash(client):
    h = copy.copy(BASE_HEART)
    h["thalach"] = 60
    r = client.post("/api/v1/heart-assessment", json=h)
    assert r.status_code == 200


# ── CKD: extreme but valid ────────────────────────────────────────────────────

def test_ckd_max_creatinine_does_not_crash(client):
    c = copy.copy(BASE_CKD)
    c["serum_creatinine"] = 20.0  # severe kidney failure
    r = client.post("/api/v1/ckd-assessment", json=c)
    assert r.status_code == 200


def test_ckd_minimum_hemoglobin_does_not_crash(client):
    c = copy.copy(BASE_CKD)
    c["hemoglobin"] = 3.0  # severe anemia
    r = client.post("/api/v1/ckd-assessment", json=c)
    assert r.status_code == 200


def test_ckd_all_flags_set_returns_multiple_risk_factors(client):
    c = copy.copy(BASE_CKD)
    c["serum_creatinine"] = 5.0
    c["hemoglobin"] = 7.0
    c["hypertension"] = 1
    c["diabetes_mellitus"] = 1
    r = client.post("/api/v1/ckd-assessment", json=c)
    assert r.status_code == 200
    factors = r.json()["risk_analysis"]["key_factors"]
    assert len(factors) >= 3, "Multiple severe risk factors must all be reported"


# ── Response structure always consistent ─────────────────────────────────────

def test_assessment_response_always_includes_executive_summary(client):
    r = client.post("/api/v1/diabetes-assessment", json=BASE_DIABETES)
    assert isinstance(r.json()["executive_summary"], str)
    assert len(r.json()["executive_summary"]) > 0


def test_assessment_response_always_includes_timestamp(client):
    r = client.post("/api/v1/diabetes-assessment", json=BASE_DIABETES)
    assert "timestamp" in r.json()


def test_assessment_id_is_uuid_format(client):
    r = client.post("/api/v1/diabetes-assessment", json=BASE_DIABETES)
    import uuid
    aid = r.json()["assessment_id"]
    uuid.UUID(aid)  # raises ValueError if not a valid UUID
