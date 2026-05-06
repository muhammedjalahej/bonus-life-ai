"""
Brain MRI Tumor Classification endpoint — Bonus Life AI
POST /api/v1/brain-mri-analysis  (multipart/form-data)

Authors: Muhammed Jalahej, Yazen Emino
"""

import json
import uuid
import logging
from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import BrainMriAnalysis
from app.auth import get_current_user_optional
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()

_ai_specialist = None
_brain_mri_service = None


def init(ai_specialist: Any, brain_mri_service: Any):
    global _ai_specialist, _brain_mri_service
    _ai_specialist = ai_specialist
    _brain_mri_service = brain_mri_service


@router.post("/brain-mri-analysis")
async def brain_mri_analysis(
    image: UploadFile = File(..., description="Brain MRI scan image (JPG/PNG)"),
    language: str = Form("english", description="Language for LLM summary"),
    db: Session = Depends(get_db),
    current_user: Optional[object] = Depends(get_current_user_optional),
):
    """
    Brain MRI tumor classification using ResNet18.
    Returns tumor type (no tumor / glioma / meningioma / pituitary), confidence,
    and per-class probabilities with an AI-generated clinical summary.

    ⚠️ For informational screening purposes only. Not a substitute for radiological diagnosis.
    """
    try:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image data received.")

        if _brain_mri_service is None:
            raise HTTPException(status_code=503, detail="Brain MRI service is not initialized.")

        # Validate image format before passing to the model so PIL parse failures
        # return 400 (bad input) rather than 500 (server error).
        try:
            import io as _io
            from PIL import Image as _PIL_Val
            _PIL_Val.open(_io.BytesIO(image_bytes)).verify()
        except ImportError:
            pass  # PIL not installed; let the service handle it
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid or unreadable image file. Please upload a valid JPG or PNG.",
            )

        result = _brain_mri_service.predict(image_bytes)

        tumor_class = result.get("tumor_class", "unknown")
        confidence = result.get("confidence")
        confidence_pct = f"{round((confidence or 0) * 100, 1)}%" if confidence is not None else "N/A"
        all_probs = result.get("all_probabilities", {})
        description = result.get("tumor_description", "")
        severity = result.get("severity", "unknown")

        # --- LLM summary ---
        all_probs_str = ", ".join(
            f"{k}: {round(v * 100, 1)}%" for k, v in all_probs.items() if v is not None
        )
        import random
        tones = ["empathetic and reassuring", "strictly objective and clinical", "warm and consultative", "direct and highly informative"]
        focus = ["highlighting the diagnostic classification", "focusing on the probability distributions", "emphasizing next steps based on the findings", "synthesizing the scan results into a clear narrative"]
        chosen_tone = random.choice(tones)
        chosen_focus = random.choice(focus)

        insights_prompt = (
            f"You are a medical AI assistant providing a {chosen_tone} brain MRI analysis summary in {language}. "
            f"Take care to vary your prose and structure so it does not look like a generic template. "
            f"Focus particularly on {chosen_focus} based on this data:\n"
            f"- Classification result: {tumor_class} (confidence: {confidence_pct}).\n"
            f"- All class probabilities — {all_probs_str}.\n"
            f"- Brief tumor description: {description}\n\n"
            "Include: \n"
            "1. A narrative clinical interpretation of the result\n"
            "2. Specific recommended next steps tailored to these findings\n"
            "3. A one-sentence medical disclaimer emphasizing this is not a radiological report.\n"
            "IMPORTANT: Do NOT use markdown bolding (like **text**) or asterisks. Output plain text paragraphs only."
        )

        executive_summary = (
            "Analysis complete. Please consult a qualified neurologist or radiologist for diagnosis."
        )
        if _ai_specialist:
            try:
                resp = await _ai_specialist.generate_medical_response(insights_prompt, language)
                if resp.get("success"):
                    executive_summary = resp["response"]
            except Exception as e:
                logger.warning(f"Brain MRI LLM summary failed: {e}")

        # --- Persist to DB if authenticated ---
        assessment_id = str(uuid.uuid4())
        payload_data = {"result": result}
        db_id = None

        if current_user:
            rec = BrainMriAnalysis(
                user_id=current_user.id,
                assessment_id=assessment_id,
                tumor_class=tumor_class,
                confidence=float(confidence) if confidence is not None else None,
                executive_summary=executive_summary,
                payload=json.dumps(payload_data),
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
            db_id = rec.id

            create_notification(
                db, current_user.id,
                "Brain MRI analysis complete",
                "Your brain MRI analysis is ready. View results in your Dashboard.",
                "success",
            )

        # Build risk_analysis for consistent response shape
        risk_analysis = {
            "tumor_class": tumor_class,
            "confidence": confidence,
            "severity": severity,
            "all_probabilities": all_probs,
            "tumor_description": description,
        }

        recommendations = _build_recommendations(tumor_class, severity)

        return {
            "id": db_id,
            "assessment_id": assessment_id,
            "timestamp": datetime.utcnow().isoformat(),
            "executive_summary": executive_summary,
            "risk_analysis": risk_analysis,
            "recommendations": recommendations,
            "model_available": result.get("model_available", False),
            "disclaimer": (
                "This analysis is an AI-assisted screening tool and does not constitute "
                "a medical diagnosis. Always consult a qualified physician or radiologist."
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Brain MRI analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Brain MRI analysis service temporarily unavailable. Please try again shortly.",
        )


def _build_recommendations(tumor_class: str, severity: str):
    base = [
        "Consult a neurologist or neurosurgeon for further evaluation.",
        "Bring this analysis report to your healthcare provider.",
    ]
    if tumor_class == "no tumor":
        return {
            "immediate": "No tumor detected. Continue routine health check-ups.",
            "lifestyle": [
                "Maintain a healthy lifestyle with regular exercise.",
                "Monitor for any neurological symptoms (headaches, vision changes, etc.).",
            ],
        }
    if severity == "high":
        return {
            "immediate": "Seek specialist consultation promptly. Do not delay.",
            "lifestyle": base + [
                "Request a comprehensive MRI with contrast enhancement for confirmation.",
                "Document all symptoms including onset, severity, and frequency.",
            ],
        }
    return {
        "immediate": "Schedule an appointment with a neurologist as soon as possible.",
        "lifestyle": base + [
            "Follow-up with contrast-enhanced MRI as recommended by your physician.",
        ],
    }
