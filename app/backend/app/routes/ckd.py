"""CKD (Chronic Kidney Disease) prediction endpoint."""

import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import CKDAssessment
from app.auth import get_current_user_optional
from app.models import CKDAssessmentRequest, CKDAssessmentResponse
from app.services.ai_specialist import AIDiabetesSpecialist
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()

_ai_specialist = None
_ckd_model = None


def init(ai_specialist: AIDiabetesSpecialist, ckd_model):
    global _ai_specialist, _ckd_model
    _ai_specialist = ai_specialist
    _ckd_model = ckd_model


@router.post("/ckd-assessment", response_model=CKDAssessmentResponse)
async def ckd_assessment(
    request: CKDAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[object] = Depends(get_current_user_optional),
):
    """Chronic Kidney Disease risk assessment using 24 clinical features."""
    try:
        logger.info(f"[DATA] CKD assessment for age {request.age}")

        features = {
            "age": request.age,
            "blood_pressure": request.blood_pressure,
            "specific_gravity": request.specific_gravity,
            "albumin": request.albumin,
            "sugar": request.sugar,
            "red_blood_cells": request.red_blood_cells,
            "pus_cell": request.pus_cell,
            "pus_cell_clumps": request.pus_cell_clumps,
            "bacteria": request.bacteria,
            "blood_glucose_random": request.blood_glucose_random,
            "blood_urea": request.blood_urea,
            "serum_creatinine": request.serum_creatinine,
            "sodium": request.sodium,
            "potassium": request.potassium,
            "hemoglobin": request.hemoglobin,
            "packed_cell_volume": request.packed_cell_volume,
            "white_blood_cell_count": request.white_blood_cell_count,
            "red_blood_cell_count": request.red_blood_cell_count,
            "hypertension": request.hypertension,
            "diabetes_mellitus": request.diabetes_mellitus,
            "coronary_artery_disease": request.coronary_artery_disease,
            "appetite": request.appetite,
            "pedal_edema": request.pedal_edema,
            "anemia": request.anemia,
        }

        prediction_label, probability, feature_importances = _ckd_model.predict(features)

        insights_prompt = (
            f"Provide a concise chronic kidney disease risk summary in {request.language}. "
            f"Patient age: {request.age}, hemoglobin: {request.hemoglobin} g/dL, "
            f"serum creatinine: {request.serum_creatinine} mg/dL, "
            f"blood urea: {request.blood_urea} mg/dL, "
            f"prediction: {prediction_label} (confidence {probability:.1%}). "
            "Include 1–2 sentences on key CKD indicators and when to consult a nephrologist."
        )
        insights_response = await _ai_specialist.generate_medical_response(
            insights_prompt, request.language
        )
        llm_insights = (
            insights_response["response"]
            if insights_response["success"]
            else "Assessment completed. Consult a nephrologist for a comprehensive kidney function evaluation."
        )

        risk_analysis = {
            "prediction": prediction_label,
            "confidence": round(probability, 3),
            "risk_level": "High Risk" if prediction_label == "CKD" else "Low Risk",
            "probability": round(probability, 3),
            "key_factors": _identify_risk_factors(features),
            "feature_importances": feature_importances,
        }
        recommendations = {
            "lifestyle_changes": _lifestyle_recommendations(prediction_label, features),
            "medical_followup": (
                "Consult a nephrologist for GFR measurement, urine albumin-to-creatinine ratio, "
                "and renal ultrasound if CKD is suspected."
                if prediction_label == "CKD"
                else "Maintain a healthy lifestyle and schedule annual kidney function tests."
            ),
        }

        assessment_id = str(uuid.uuid4())

    except Exception as e:
        logger.error(f"CKD assessment error: {e}")
        raise HTTPException(
            status_code=500,
            detail="CKD assessment service temporarily unavailable. Please try again shortly.",
        )

    if current_user:
        try:
            payload = {
                "request": request.dict(),
                "risk_analysis": risk_analysis,
                "recommendations": recommendations,
            }
            rec = CKDAssessment(
                user_id=current_user.id,
                assessment_id=assessment_id,
                prediction=prediction_label,
                confidence=float(probability),
                executive_summary=llm_insights,
                payload=json.dumps(payload),
            )
            db.add(rec)
            db.commit()
            create_notification(
                db, current_user.id,
                "CKD assessment complete",
                "Your kidney disease risk assessment is ready. View it in your Dashboard.",
                "success",
            )
        except Exception as db_err:
            logger.error(f"Failed to save CKD assessment to DB: {db_err}")
            db.rollback()

    return CKDAssessmentResponse(
        assessment_id=assessment_id,
        timestamp=datetime.utcnow().isoformat(),
        prediction=prediction_label,
        confidence=round(probability, 3),
        executive_summary=llm_insights,
        risk_analysis=risk_analysis,
        recommendations=recommendations,
    )


def _identify_risk_factors(features: Dict[str, Any]) -> List[Dict[str, Any]]:
    factors = []
    sc = features.get("serum_creatinine", 0)
    if sc > 1.5:
        factors.append({"factor": f"Elevated serum creatinine ({sc} mg/dL)", "severity": "high"})
    elif sc > 1.2:
        factors.append({"factor": f"Borderline serum creatinine ({sc} mg/dL)", "severity": "moderate"})

    bu = features.get("blood_urea", 0)
    if bu > 40:
        factors.append({"factor": f"Elevated blood urea ({bu} mg/dL)", "severity": "high"})

    hemo = features.get("hemoglobin", 15)
    if hemo < 10:
        factors.append({"factor": f"Low hemoglobin — anemia ({hemo} g/dL)", "severity": "high"})
    elif hemo < 12:
        factors.append({"factor": f"Mildly low hemoglobin ({hemo} g/dL)", "severity": "moderate"})

    al = features.get("albumin", 0)
    if al >= 3:
        factors.append({"factor": f"High albuminuria (albumin={al})", "severity": "high"})
    elif al >= 1:
        factors.append({"factor": f"Mild albuminuria (albumin={al})", "severity": "moderate"})

    htn = features.get("hypertension", 0)
    if htn == 1:
        factors.append({"factor": "Hypertension present", "severity": "high"})

    dm = features.get("diabetes_mellitus", 0)
    if dm == 1:
        factors.append({"factor": "Diabetes mellitus present", "severity": "high"})

    bp = features.get("blood_pressure", 0)
    if bp >= 90:
        factors.append({"factor": f"Elevated blood pressure ({bp} mmHg diastolic)", "severity": "moderate"})

    if not factors:
        factors.append({"factor": "No major CKD risk indicators from inputs", "severity": "low"})
    return factors


def _lifestyle_recommendations(prediction: str, features: Dict[str, Any]) -> List[str]:
    recs = [
        "Maintain adequate hydration (1.5–2L water/day unless restricted)",
        "Adopt a kidney-friendly diet: limit sodium, protein, and phosphorus",
        "Monitor blood pressure regularly and keep it under 130/80 mmHg",
        "Control blood sugar if diabetic — HbA1c < 7%",
        "Avoid nephrotoxic medications (NSAIDs, contrast dyes) without physician guidance",
    ]
    if prediction == "CKD":
        recs.insert(0, "Seek nephrology consultation promptly for CKD staging (eGFR, urine ACR)")
        recs.append("Avoid smoking and limit alcohol consumption")
        recs.append("Schedule follow-up kidney function tests every 3–6 months")
    else:
        recs.append("Annual kidney function screening is recommended")
        recs.append("Stay physically active with moderate exercise (150 min/week)")
    return recs
