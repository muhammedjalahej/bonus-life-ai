"""Unit tests for pure helper functions in app/routes/assessment.py."""

import pytest

from app.routes.assessment import (
    _identify_risk_factors,
    _calculate_metabolic_age,
    _calculate_health_score,
    _generate_lifestyle_recommendations,
)


def _features(**overrides):
    base = {
        "Pregnancies": 0,
        "Glucose": 90.0,
        "BloodPressure": 80.0,
        "SkinThickness": 20.0,
        "Insulin": 80.0,
        "BMI": 22.0,
        "DiabetesPedigreeFunction": 0.5,
        "Age": 30,
    }
    base.update(overrides)
    return base


# ── _identify_risk_factors ────────────────────────────────────────────────────

def test_no_risk_factors_for_normal_values():
    factors = _identify_risk_factors(_features(), bmi=22.0)
    assert any("No significant" in f["factor"] for f in factors)


def test_diabetes_level_glucose_is_high():
    factors = _identify_risk_factors(_features(Glucose=130), bmi=22.0)
    assert any("Diabetes-level glucose" in f["factor"] for f in factors)
    assert any(f["severity"] == "high" for f in factors if "Diabetes-level glucose" in f["factor"])


def test_prediabetes_glucose_is_moderate():
    factors = _identify_risk_factors(_features(Glucose=110), bmi=22.0)
    assert any("Prediabetes" in f["factor"] for f in factors)
    moderate = [f for f in factors if "Prediabetes" in f["factor"]]
    assert moderate[0]["severity"] == "moderate"


def test_glucose_exactly_at_diabetes_threshold():
    factors = _identify_risk_factors(_features(Glucose=126), bmi=22.0)
    assert any("Diabetes-level glucose" in f["factor"] for f in factors)


def test_clinical_obesity_bmi_high():
    factors = _identify_risk_factors(_features(), bmi=32.0)
    assert any("Clinical obesity" in f["factor"] for f in factors)
    assert any(f["severity"] == "high" for f in factors if "obesity" in f["factor"])


def test_overweight_bmi_moderate():
    factors = _identify_risk_factors(_features(), bmi=27.0)
    assert any("Overweight" in f["factor"] for f in factors)
    overweight = [f for f in factors if "Overweight" in f["factor"]]
    assert overweight[0]["severity"] == "moderate"


def test_stage2_hypertension():
    factors = _identify_risk_factors(_features(BloodPressure=145), bmi=22.0)
    assert any("Stage 2 hypertension" in f["factor"] for f in factors)


def test_stage1_hypertension():
    factors = _identify_risk_factors(_features(BloodPressure=132), bmi=22.0)
    assert any("Stage 1 hypertension" in f["factor"] for f in factors)


def test_age_risk_at_45():
    factors = _identify_risk_factors(_features(Age=45), bmi=22.0)
    assert any("Age-related" in f["factor"] for f in factors)


def test_multiple_factors_returned():
    factors = _identify_risk_factors(_features(Glucose=130, BloodPressure=145, Age=50), bmi=33.0)
    assert len(factors) >= 3


def test_risk_factors_list_not_empty():
    factors = _identify_risk_factors(_features(), bmi=22.0)
    assert isinstance(factors, list)
    assert len(factors) >= 1


# ── _calculate_metabolic_age ──────────────────────────────────────────────────

def test_metabolic_age_is_int():
    age = _calculate_metabolic_age(_features(Age=40))
    assert isinstance(age, int)


def test_metabolic_age_minimum_is_20():
    age = _calculate_metabolic_age(_features(Age=18, Glucose=90, BMI=22.0, BloodPressure=115))
    assert age >= 20


def test_good_metrics_reduce_metabolic_age():
    good = _calculate_metabolic_age(_features(Age=40, Glucose=90, BMI=22.0, BloodPressure=115))
    base = _calculate_metabolic_age(_features(Age=40, Glucose=130, BMI=32.0, BloodPressure=145))
    assert good <= base


# ── _calculate_health_score ───────────────────────────────────────────────────

def test_health_score_returns_int():
    score = _calculate_health_score(_features())
    assert isinstance(score, int)


def test_health_score_within_bounds():
    score = _calculate_health_score(_features())
    assert 0 <= score <= 100


def test_health_score_caps_at_100():
    score = _calculate_health_score(_features(Glucose=90, BMI=22.0, BloodPressure=110))
    assert score <= 100


def test_ideal_metrics_give_higher_score():
    ideal = _calculate_health_score(_features(Glucose=90, BMI=22.0, BloodPressure=115))
    poor = _calculate_health_score(_features(Glucose=140, BMI=35.0, BloodPressure=150))
    assert ideal > poor


# ── _generate_lifestyle_recommendations ──────────────────────────────────────

def test_high_risk_recommendations_include_immediate_consultation():
    recs = _generate_lifestyle_recommendations("High Risk", _features())
    assert any("Immediate consultation" in r for r in recs)


def test_low_risk_recommendations_include_exercise():
    recs = _generate_lifestyle_recommendations("Low Risk", _features())
    assert any("physical activity" in r.lower() or "exercise" in r.lower() for r in recs)


def test_high_bmi_adds_weight_management():
    recs = _generate_lifestyle_recommendations("Low Risk", _features(BMI=28.0))
    assert any("weight" in r.lower() for r in recs)


def test_high_glucose_adds_blood_sugar_monitoring():
    recs = _generate_lifestyle_recommendations("Low Risk", _features(Glucose=105))
    assert any("blood sugar" in r.lower() for r in recs)


def test_recommendations_returns_list():
    recs = _generate_lifestyle_recommendations("Low Risk", _features())
    assert isinstance(recs, list)
    assert len(recs) > 0
