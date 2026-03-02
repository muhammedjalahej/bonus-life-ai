"""Heart disease risk assessment endpoint (UCI Cleveland-style features)."""

import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import HeartAssessment
from app.auth import get_current_user_optional
from app.models import HeartAssessmentRequest, HeartAssessmentResponse
from app.services.ai_specialist import AIDiabetesSpecialist
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()

_ai_specialist = None
_heart_model = None


def init(ai_specialist: AIDiabetesSpecialist, heart_model):
    global _ai_specialist, _heart_model
    _ai_specialist = ai_specialist
    _heart_model = heart_model


@router.post("/heart-assessment", response_model=HeartAssessmentResponse)
async def heart_assessment(
    request: HeartAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[object] = Depends(get_current_user_optional),
):
    """Heart disease risk assessment using Cleveland-style clinical features."""
    try:
        logger.info(f"[DATA] Heart assessment for age {request.age}")

        features = {
            "age": request.age,
            "sex": request.sex,
            "cp": request.cp,
            "trestbps": request.trestbps,
            "chol": request.chol,
            "fbs": request.fbs,
            "restecg": request.restecg,
            "thalach": request.thalach,
            "exang": request.exang,
            "oldpeak": request.oldpeak,
            "slope": request.slope,
            "ca": request.ca,
            "thal": request.thal,
        }

        risk_label, probability, feature_importances = _heart_model.predict(features)

        insights_prompt = (
            f"Provide a short heart disease risk assessment summary in {request.language} "
            f"based on: age {request.age}, resting BP {request.trestbps} mmHg, "
            f"cholesterol {request.chol} mg/dL, max heart rate {request.thalach}, "
            f"risk level {risk_label} (probability {probability:.1%}). "
            "Include 1–2 sentences on key factors and when to see a doctor."
        )
        insights_response = await _ai_specialist.generate_medical_response(
            insights_prompt, request.language
        )
        llm_insights = (
            insights_response["response"]
            if insights_response["success"]
            else "Assessment completed. Consult a healthcare provider for a full cardiac evaluation."
        )

        risk_analysis = {
            "risk_level": risk_label,
            "probability": round(probability, 3),
            "key_factors": _identify_risk_factors(features),
            "feature_importances": feature_importances,
        }
        recommendations = {
            "lifestyle_changes": _lifestyle_recommendations(risk_label, features),
            "medical_followup": "Consult a cardiologist or GP for ECG and lipid panel if risk is moderate or high.",
        }

        assessment_id = str(uuid.uuid4())
        if current_user:
            payload = {
                "request": request.dict(),
                "risk_analysis": risk_analysis,
                "recommendations": recommendations,
            }
            rec = HeartAssessment(
                user_id=current_user.id,
                assessment_id=assessment_id,
                risk_level=risk_label,
                probability=float(probability),
                executive_summary=llm_insights,
                payload=json.dumps(payload),
            )
            db.add(rec)
            db.commit()
            create_notification(
                db, current_user.id,
                "Heart assessment complete",
                "Your heart risk assessment is ready. View it in your Dashboard.",
                "success",
            )

        return HeartAssessmentResponse(
            assessment_id=assessment_id,
            timestamp=datetime.utcnow().isoformat(),
            executive_summary=llm_insights,
            risk_analysis=risk_analysis,
            recommendations=recommendations,
        )
    except Exception as e:
        logger.error(f"Heart assessment error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Heart assessment service temporarily unavailable. Please try again shortly.",
        )


def _identify_risk_factors(features: Dict[str, Any]) -> List[Dict[str, Any]]:
    factors = []
    if features.get("trestbps", 0) >= 140:
        factors.append({"factor": "Elevated resting blood pressure", "severity": "high"})
    elif features.get("trestbps", 0) >= 130:
        factors.append({"factor": "Borderline high blood pressure", "severity": "moderate"})
    if features.get("chol", 0) >= 240:
        factors.append({"factor": "High cholesterol", "severity": "high"})
    elif features.get("chol", 0) >= 200:
        factors.append({"factor": "Borderline high cholesterol", "severity": "moderate"})
    if features.get("age", 0) >= 55:
        factors.append({"factor": "Age-related cardiovascular risk", "severity": "moderate"})
    if features.get("thalach", 200) < 120:
        factors.append({"factor": "Low max heart rate (possible limitation)", "severity": "moderate"})
    if features.get("exang", 0) == 1:
        factors.append({"factor": "Exercise-induced angina", "severity": "high"})
    if not factors:
        factors.append({"factor": "No major risk factors identified from inputs", "severity": "low"})
    return factors


def _lifestyle_recommendations(risk_level: str, features: Dict[str, Any]) -> List[str]:
    recs = [
        "Regular aerobic exercise (e.g. 150 min/week moderate intensity)",
        "Heart-healthy diet (Mediterranean style, limit saturated fat)",
        "Avoid smoking; limit alcohol",
    ]
    if "high" in risk_level.lower() or "moderate" in risk_level.lower():
        recs.insert(0, "Consult a doctor for ECG and lipid panel")
    if features.get("trestbps", 0) >= 130:
        recs.append("Monitor blood pressure regularly")
    if features.get("chol", 0) >= 200:
        recs.append("Consider cholesterol recheck and diet adjustments")
    return recs
