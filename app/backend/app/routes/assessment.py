"""Diabetes risk assessment endpoint."""

import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import Assessment
from app.auth import get_current_user_optional
from app.models import DiabetesAssessmentRequest, AssessmentResponse

logger = logging.getLogger(__name__)
router = APIRouter()

_ai_specialist = None
_diabetes_model = None


def init(ai_specialist, diabetes_model):
    global _ai_specialist, _diabetes_model
    _ai_specialist = ai_specialist
    _diabetes_model = diabetes_model


@router.post("/diabetes-assessment", response_model=AssessmentResponse)
async def diabetes_assessment(
    request: DiabetesAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[object] = Depends(get_current_user_optional),
):
    """Diabetes risk assessment with LLM-powered insights."""
    try:
        logger.info(f"[DATA] Diabetes assessment for age {request.age}")

        height_m = request.height / 100
        bmi = request.weight / (height_m ** 2)
        bmi_category = (
            "Underweight" if bmi < 18.5
            else "Normal" if bmi < 25
            else "Overweight" if bmi < 30
            else "Obese"
        )

        features = {
            "Pregnancies": request.pregnancies,
            "Glucose": request.glucose,
            "BloodPressure": request.blood_pressure,
            "SkinThickness": request.skin_thickness,
            "Insulin": request.insulin,
            "BMI": bmi,
            "DiabetesPedigreeFunction": request.diabetes_pedigree_function,
            "Age": request.age,
        }

        risk_label, probability, feature_importances = _diabetes_model.predict(features)

        # SHAP explainability (per-prediction)
        shap_explanation = None
        if hasattr(_diabetes_model, "explain"):
            shap_explanation = _diabetes_model.explain(features)

        insights_prompt = (
            f"Provide a comprehensive diabetes risk assessment summary in {request.language} "
            f"based on these metrics:\n"
            f"- Age: {request.age} years\n"
            f"- Glucose: {request.glucose} mg/dL\n"
            f"- Blood Pressure: {request.blood_pressure} mmHg\n"
            f"- BMI: {bmi:.1f} ({bmi_category})\n"
            f"- Risk Level: {risk_label} (Probability: {probability:.1%})\n\n"
            "Please provide:\n"
            "1. Executive summary of the assessment\n"
            "2. Key risk factors identified\n"
            "3. Immediate lifestyle recommendations\n"
            "4. When to consult a healthcare provider\n"
        )

        insights_response = await _ai_specialist.generate_medical_response(
            insights_prompt, request.language
        )
        llm_insights = (
            insights_response["response"]
            if insights_response["success"]
            else "Assessment completed. Please consult with healthcare provider for detailed analysis."
        )

        assessment_id = str(uuid.uuid4())
        risk_analysis = {
            "risk_level": risk_label,
            "probability": round(probability, 3),
            "key_factors": _identify_risk_factors(features, bmi),
            "feature_importances": feature_importances,
            **({"shap_explanation": shap_explanation} if shap_explanation else {}),
        }
        health_metrics = {
            "bmi": round(bmi, 1),
            "bmi_category": bmi_category,
            "metabolic_age": _calculate_metabolic_age(features),
            "health_score": _calculate_health_score(features),
        }
        recommendations = {
            "lifestyle_changes": _generate_lifestyle_recommendations(risk_label, features),
            "medical_followup": "Consult healthcare provider for comprehensive evaluation",
            "monitoring_schedule": "Regular check-ups recommended",
        }

        if current_user:
            payload = {
                "request": request.dict(),
                "risk_analysis": risk_analysis,
                "health_metrics": health_metrics,
                "recommendations": recommendations,
            }
            rec = Assessment(
                user_id=current_user.id,
                assessment_id=assessment_id,
                risk_level=risk_label,
                probability=float(probability),
                executive_summary=llm_insights,
                payload=json.dumps(payload),
            )
            db.add(rec)
            db.commit()

        return AssessmentResponse(
            assessment_id=assessment_id,
            timestamp=datetime.utcnow().isoformat(),
            executive_summary=llm_insights,
            risk_analysis=risk_analysis,
            health_metrics=health_metrics,
            recommendations=recommendations,
        )
    except Exception as e:
        logger.error(f"Assessment error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Assessment service temporarily unavailable. Please try again shortly.",
        )


# -- helper functions ---------------------------------------------------------

def _identify_risk_factors(features: Dict[str, Any], bmi: float) -> List[Dict[str, Any]]:
    risk_factors = []
    if features["Glucose"] >= 126:
        risk_factors.append({"factor": "Diabetes-level glucose", "severity": "high"})
    elif features["Glucose"] >= 100:
        risk_factors.append({"factor": "Prediabetes glucose levels", "severity": "moderate"})
    if bmi >= 30:
        risk_factors.append({"factor": "Clinical obesity", "severity": "high"})
    elif bmi >= 25:
        risk_factors.append({"factor": "Overweight", "severity": "moderate"})
    if features["BloodPressure"] >= 140:
        risk_factors.append({"factor": "Stage 2 hypertension", "severity": "high"})
    elif features["BloodPressure"] >= 130:
        risk_factors.append({"factor": "Stage 1 hypertension", "severity": "moderate"})
    if features["Age"] >= 45:
        risk_factors.append({"factor": "Age-related risk increase", "severity": "moderate"})
    return risk_factors if risk_factors else [{"factor": "No significant risk factors identified", "severity": "low"}]


def _calculate_metabolic_age(features: Dict[str, Any]) -> int:
    base_age = features["Age"]
    adj = 0
    if features["Glucose"] < 100:
        adj -= 3
    if features["BMI"] < 25:
        adj -= 2
    if features["BloodPressure"] < 120:
        adj -= 2
    return max(20, base_age + adj)


def _calculate_health_score(features: Dict[str, Any]) -> int:
    score = 50
    bmi = features.get("BMI", 25)
    if 18.5 <= bmi <= 24.9:
        score += 20
    elif 25 <= bmi <= 29.9:
        score += 10
    glucose = features.get("Glucose", 100)
    if glucose < 100:
        score += 20
    elif glucose < 126:
        score += 10
    bp = features.get("BloodPressure", 120)
    if bp < 120:
        score += 15
    elif bp < 140:
        score += 10
    return min(100, score)


def _generate_lifestyle_recommendations(risk_level: str, features: Dict[str, Any]) -> List[str]:
    recs = []
    if "high" in risk_level.lower():
        recs.extend([
            "Immediate consultation with healthcare provider",
            "Comprehensive blood work and monitoring",
            "Structured diet and exercise program",
        ])
    else:
        recs.extend([
            "Regular physical activity (30 mins daily)",
            "Balanced diet with portion control",
            "Regular health check-ups",
            "Stress management and adequate sleep",
        ])
    if features.get("BMI", 0) > 25:
        recs.append("Weight management program")
    if features.get("Glucose", 0) > 100:
        recs.append("Blood sugar monitoring")
    return recs
