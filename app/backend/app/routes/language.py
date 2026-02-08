"""Language detection endpoint."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Form

from app.services.language import LanguageProcessor, calculate_detection_confidence

logger = logging.getLogger(__name__)
router = APIRouter()

_language_processor = LanguageProcessor()


@router.post("/detect-language")
async def enhanced_language_detection(text: str = Form(...)):
    """Enhanced language detection with confidence scoring."""
    try:
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        detected_language = _language_processor.detect_language(text)
        confidence_score = calculate_detection_confidence(text, detected_language)

        return {
            "detected_language": detected_language,
            "confidence_score": confidence_score,
            "confidence_level": "high" if confidence_score > 0.8 else "medium",
            "input_length": len(text),
            "detection_method": "keyword_analysis",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Enhanced language detection error")
        raise HTTPException(status_code=500, detail="Error detecting language")
