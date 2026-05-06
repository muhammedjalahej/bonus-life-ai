"""
Edge-case tests: Pydantic boundary values for all assessment request models.
Tests verify that boundary values are accepted and out-of-range values are rejected.
"""

import copy

import pytest


# ── Diabetes: boundary values ─────────────────────────────────────────────────

BASE_DIABETES = {
    "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
    "height": 170.0, "age": 35, "pregnancies": 0,
    "skin_thickness": 20.0, "insulin": 80.0,
    "diabetes_pedigree_function": 0.5, "language": "english",
}


def _diab(**overrides):
    d = copy.copy(BASE_DIABETES)
    d.update(overrides)
    return d


def test_diabetes_glucose_minimum_boundary(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(glucose=0.0))
    assert r.status_code == 200


def test_diabetes_glucose_maximum_boundary(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(glucose=500.0))
    assert r.status_code == 200


def test_diabetes_glucose_above_max_returns_422(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(glucose=500.1))
    assert r.status_code == 422


def test_diabetes_glucose_below_min_returns_422(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(glucose=-0.1))
    assert r.status_code == 422


def test_diabetes_age_minimum_boundary(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(age=1))
    assert r.status_code == 200


def test_diabetes_age_maximum_boundary(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(age=120))
    assert r.status_code == 200


def test_diabetes_age_above_max_returns_422(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(age=121))
    assert r.status_code == 422


def test_diabetes_age_zero_returns_422(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(age=0))
    assert r.status_code == 422


def test_diabetes_weight_minimum_boundary(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(weight=20.0))
    assert r.status_code == 200


def test_diabetes_weight_below_min_returns_422(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(weight=19.9))
    assert r.status_code == 422


def test_diabetes_height_minimum_boundary(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(height=50.0))
    assert r.status_code == 200


def test_diabetes_height_below_min_returns_422(client):
    r = client.post("/api/v1/diabetes-assessment", json=_diab(height=49.9))
    assert r.status_code == 422


# ── Heart: boundary values ────────────────────────────────────────────────────

BASE_HEART = {
    "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250,
    "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
    "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 3, "language": "english",
}


def _heart(**overrides):
    d = copy.copy(BASE_HEART)
    d.update(overrides)
    return d


def test_heart_trestbps_minimum_boundary(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(trestbps=80))
    assert r.status_code == 200


def test_heart_trestbps_below_min_returns_422(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(trestbps=79))
    assert r.status_code == 422


def test_heart_chol_minimum_boundary(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(chol=100))
    assert r.status_code == 200


def test_heart_chol_below_min_returns_422(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(chol=99))
    assert r.status_code == 422


def test_heart_chol_maximum_boundary(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(chol=600))
    assert r.status_code == 200


def test_heart_thalach_minimum_boundary(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(thalach=60))
    assert r.status_code == 200


def test_heart_sex_invalid_returns_422(client):
    r = client.post("/api/v1/heart-assessment", json=_heart(sex=2))
    assert r.status_code == 422


# ── CKD: boundary values ──────────────────────────────────────────────────────

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


def _ckd(**overrides):
    d = copy.copy(BASE_CKD)
    d.update(overrides)
    return d


def test_ckd_serum_creatinine_minimum_boundary(client):
    r = client.post("/api/v1/ckd-assessment", json=_ckd(serum_creatinine=0.1))
    assert r.status_code == 200


def test_ckd_serum_creatinine_below_min_returns_422(client):
    r = client.post("/api/v1/ckd-assessment", json=_ckd(serum_creatinine=0.09))
    assert r.status_code == 422


def test_ckd_serum_creatinine_maximum_boundary(client):
    r = client.post("/api/v1/ckd-assessment", json=_ckd(serum_creatinine=20.0))
    assert r.status_code == 200


def test_ckd_specific_gravity_minimum_boundary(client):
    r = client.post("/api/v1/ckd-assessment", json=_ckd(specific_gravity=1.000))
    assert r.status_code == 200


# ── Auth: password boundary values ───────────────────────────────────────────

def test_password_exactly_8_chars_accepted(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "pw8@example.com",
        "password": "Exactly8",
    })
    assert r.status_code == 200


def test_password_7_chars_rejected(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "pw7@example.com",
        "password": "Only7ch",
    })
    assert r.status_code == 422


def test_password_128_chars_accepted(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "pw128@example.com",
        "password": "A" * 128,
    })
    assert r.status_code == 200


def test_password_129_chars_rejected(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "pw129@example.com",
        "password": "A" * 129,
    })
    assert r.status_code == 422
