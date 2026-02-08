"""Emergency symptom assessment endpoint."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models import EmergencyAssessmentRequest, EmergencyAssessmentResponse
from app.services.emergency import _analyze_with_personal_context, _generate_personalized_fallback

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/emergency-assessment", response_model=EmergencyAssessmentResponse)
async def personalized_emergency_assessment(request: EmergencyAssessmentRequest):
    """Personalized emergency symptom assessment."""
    try:
        personalized_data = await _analyze_with_personal_context(
            request.symptoms,
            request.age,
            request.weight,
            request.height,
            request.existing_conditions,
            request.current_medications,
            request.language,
        )
        return EmergencyAssessmentResponse(
            assessment=personalized_data["assessment"],
            personalized_analysis=personalized_data["personalized_analysis"],
            recommendations=personalized_data["recommendations"],
            urgency_level=personalized_data["urgency_level"],
            risk_factors=personalized_data["risk_factors"],
            next_steps=personalized_data["next_steps"],
            timestamp=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        logger.error(f"Personalized assessment error: {e}")
        return await _generate_personalized_fallback(request)
