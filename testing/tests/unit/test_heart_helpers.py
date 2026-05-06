"""
GAP 4 — Heart risk helper unit tests.

Tests for _identify_risk_factors and _lifestyle_recommendations (renamed
_generate_heart_recommendations here for the spec) from app.routes.heart.
All tests import the helpers directly — no HTTP call, no database.
"""

import pytest
from app.routes.heart import _identify_risk_factors, _lifestyle_recommendations


# ─── Helper: build a baseline features dict ──────────────────────────────────

def _base():
    """Low-risk baseline: all values in the normal range."""
    return {
        "age": 40,
        "sex": 0,
        "cp": 0,         # asymptomatic (0)
        "trestbps": 120,
        "chol": 180,
        "fbs": 0,
        "restecg": 0,
        "thalach": 150,
        "exang": 0,
        "oldpeak": 0.0,
        "slope": 1,
        "ca": 0,
        "thal": 3,
    }


# ─── Cholesterol thresholds ───────────────────────────────────────────────────

def test_chol_below_200_no_cholesterol_flag():
    f = {**_base(), "chol": 180}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert not any("cholesterol" in l for l in labels), (
        "chol=180 should not trigger a cholesterol risk factor"
    )


def test_chol_200_triggers_borderline_flag():
    f = {**_base(), "chol": 200}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("borderline" in l and "cholesterol" in l for l in labels), (
        "chol=200 should trigger 'Borderline high cholesterol'"
    )


def test_chol_239_still_borderline():
    f = {**_base(), "chol": 239}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("borderline" in l and "cholesterol" in l for l in labels)


def test_chol_240_triggers_high_flag():
    f = {**_base(), "chol": 240}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("high cholesterol" in l for l in labels), (
        "chol=240 should trigger 'High cholesterol'"
    )


def test_chol_300_triggers_high_flag():
    f = {**_base(), "chol": 300}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("high cholesterol" in l for l in labels)


# ─── Blood pressure thresholds ───────────────────────────────────────────────

def test_trestbps_below_130_no_bp_flag():
    f = {**_base(), "trestbps": 120}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert not any("blood pressure" in l for l in labels)


def test_trestbps_130_triggers_borderline_bp():
    f = {**_base(), "trestbps": 130}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("borderline" in l and "blood pressure" in l for l in labels), (
        "trestbps=130 should trigger 'Borderline high blood pressure'"
    )


def test_trestbps_140_triggers_elevated_bp():
    f = {**_base(), "trestbps": 140}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("elevated" in l and "blood pressure" in l for l in labels), (
        "trestbps=140 should trigger 'Elevated resting blood pressure'"
    )


def test_trestbps_160_triggers_elevated_bp():
    f = {**_base(), "trestbps": 160}
    factors = _identify_risk_factors(f)
    severities = [x["severity"] for x in factors if "blood pressure" in x["factor"].lower()]
    assert "high" in severities


# ─── Age groups ──────────────────────────────────────────────────────────────

def test_age_54_no_age_flag():
    f = {**_base(), "age": 54}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert not any("age" in l for l in labels)


def test_age_55_triggers_age_flag():
    f = {**_base(), "age": 55}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("age" in l for l in labels), (
        "age=55 should trigger age-related risk factor"
    )


def test_age_70_triggers_age_flag():
    f = {**_base(), "age": 70}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("age" in l for l in labels)


# ─── Exercise-induced angina ──────────────────────────────────────────────────

def test_exang_0_no_angina_flag():
    f = {**_base(), "exang": 0}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert not any("angina" in l for l in labels)


def test_exang_1_triggers_angina_flag():
    f = {**_base(), "exang": 1}
    factors = _identify_risk_factors(f)
    labels = [x["factor"].lower() for x in factors]
    assert any("angina" in l for l in labels), (
        "exang=1 should trigger exercise-induced angina factor"
    )
    # Angina should be high severity
    sev = [x["severity"] for x in factors if "angina" in x["factor"].lower()]
    assert "high" in sev


# ─── No-factor fallback ───────────────────────────────────────────────────────

def test_all_normal_returns_at_least_one_item():
    """_identify_risk_factors must never return an empty list."""
    factors = _identify_risk_factors(_base())
    assert len(factors) >= 1


def test_all_normal_returns_no_significant_factor():
    """All-normal inputs should return the 'No major risk factors' placeholder."""
    factors = _identify_risk_factors(_base())
    labels = [x["factor"].lower() for x in factors]
    assert any("no major" in l for l in labels), (
        "All-normal inputs should return 'No major risk factors identified'"
    )


# ─── _lifestyle_recommendations (_generate_heart_recommendations) ────────────

def test_recommendations_returns_list():
    recs = _lifestyle_recommendations("Low Risk", _base())
    assert isinstance(recs, list)


def test_recommendations_not_empty():
    recs = _lifestyle_recommendations("Low Risk", _base())
    assert len(recs) >= 1


def test_high_risk_recommendations_longer_than_low_risk():
    """High-risk profile should produce a longer recommendations list."""
    low_risk_f = _base()
    high_risk_f = {**_base(), "trestbps": 160, "chol": 280, "exang": 1, "age": 65}

    low_recs = _lifestyle_recommendations("Low Risk", low_risk_f)
    high_recs = _lifestyle_recommendations("High Risk", high_risk_f)
    assert len(high_recs) > len(low_recs), (
        "High-risk profile should generate more recommendations than low-risk"
    )


def test_recommendations_high_risk_contains_doctor_advice():
    """High-risk profile should explicitly mention consulting a doctor or cardiologist."""
    recs = _lifestyle_recommendations("High Risk", {**_base(), "trestbps": 150, "chol": 260})
    combined = " ".join(recs).lower()
    assert "doctor" in combined or "cardiologist" in combined or "consult" in combined


# ─── Edge cases: min / max values ────────────────────────────────────────────

def test_min_values_no_crash():
    """Minimum realistic feature values must not raise any exception."""
    min_features = {
        "age": 18, "sex": 0, "cp": 0, "trestbps": 80, "chol": 100,
        "fbs": 0, "restecg": 0, "thalach": 60, "exang": 0,
        "oldpeak": 0.0, "slope": 0, "ca": 0, "thal": 0,
    }
    factors = _identify_risk_factors(min_features)
    assert isinstance(factors, list)
    recs = _lifestyle_recommendations("Low Risk", min_features)
    assert isinstance(recs, list)


def test_max_values_no_crash():
    """Maximum realistic feature values must not raise any exception."""
    max_features = {
        "age": 80, "sex": 1, "cp": 3, "trestbps": 200, "chol": 600,
        "fbs": 1, "restecg": 2, "thalach": 220, "exang": 1,
        "oldpeak": 6.2, "slope": 2, "ca": 4, "thal": 7,
    }
    factors = _identify_risk_factors(max_features)
    assert isinstance(factors, list)
    recs = _lifestyle_recommendations("High Risk", max_features)
    assert isinstance(recs, list)
