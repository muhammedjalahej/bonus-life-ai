"""Unit tests for pure helper functions in app/routes/ckd.py."""

import pytest

from app.routes.ckd import _identify_risk_factors, _lifestyle_recommendations


def _features(**overrides):
    base = {
        "age": 45,
        "blood_pressure": 80,
        "specific_gravity": 1.020,
        "albumin": 0,
        "sugar": 0,
        "red_blood_cells": 0,
        "pus_cell": 0,
        "pus_cell_clumps": 0,
        "bacteria": 0,
        "blood_glucose_random": 120.0,
        "blood_urea": 25.0,
        "serum_creatinine": 1.0,
        "sodium": 140.0,
        "potassium": 4.5,
        "hemoglobin": 14.0,
        "packed_cell_volume": 40.0,
        "white_blood_cell_count": 7800.0,
        "red_blood_cell_count": 5.0,
        "hypertension": 0,
        "diabetes_mellitus": 0,
        "coronary_artery_disease": 0,
        "appetite": 1,
        "pedal_edema": 0,
        "anemia": 0,
    }
    base.update(overrides)
    return base


# ── _identify_risk_factors ────────────────────────────────────────────────────

def test_elevated_creatinine_is_high_severity():
    factors = _identify_risk_factors(_features(serum_creatinine=2.5))
    high = [f for f in factors if "creatinine" in f["factor"].lower() and f["severity"] == "high"]
    assert high, "Expected a high-severity creatinine factor"


def test_borderline_creatinine_is_moderate():
    factors = _identify_risk_factors(_features(serum_creatinine=1.3))
    moderate = [f for f in factors if "creatinine" in f["factor"].lower() and f["severity"] == "moderate"]
    assert moderate, "Expected a moderate-severity creatinine factor"


def test_normal_creatinine_not_flagged():
    factors = _identify_risk_factors(_features(serum_creatinine=1.0))
    creatinine_flags = [f for f in factors if "creatinine" in f["factor"].lower()]
    assert not creatinine_flags


def test_elevated_blood_urea_flagged():
    factors = _identify_risk_factors(_features(blood_urea=50))
    assert any("urea" in f["factor"].lower() for f in factors)


def test_low_hemoglobin_severe_anemia():
    factors = _identify_risk_factors(_features(hemoglobin=8.0))
    assert any("hemoglobin" in f["factor"].lower() and f["severity"] == "high" for f in factors)


def test_mildly_low_hemoglobin_moderate():
    factors = _identify_risk_factors(_features(hemoglobin=11.0))
    assert any("hemoglobin" in f["factor"].lower() and f["severity"] == "moderate" for f in factors)


def test_hypertension_flagged_as_high():
    factors = _identify_risk_factors(_features(hypertension=1))
    assert any("Hypertension" in f["factor"] and f["severity"] == "high" for f in factors)


def test_diabetes_mellitus_flagged():
    factors = _identify_risk_factors(_features(diabetes_mellitus=1))
    assert any("Diabetes mellitus" in f["factor"] for f in factors)


def test_no_risk_factors_returns_placeholder():
    factors = _identify_risk_factors(_features())
    assert any("No major CKD risk" in f["factor"] for f in factors)


def test_factors_list_always_non_empty():
    factors = _identify_risk_factors(_features())
    assert isinstance(factors, list)
    assert len(factors) >= 1


# ── _lifestyle_recommendations ────────────────────────────────────────────────

def test_ckd_recommendations_include_nephrologist():
    recs = _lifestyle_recommendations("CKD", _features())
    assert any("nephrolog" in r.lower() for r in recs)


def test_ckd_recommendations_include_followup():
    recs = _lifestyle_recommendations("CKD", _features())
    assert any("follow" in r.lower() or "kidney function" in r.lower() for r in recs)


def test_no_ckd_recommendations_include_annual_screening():
    recs = _lifestyle_recommendations("No CKD", _features())
    assert any("annual" in r.lower() or "screening" in r.lower() for r in recs)


def test_recommendations_returns_list():
    recs = _lifestyle_recommendations("No CKD", _features())
    assert isinstance(recs, list)
    assert len(recs) > 0
