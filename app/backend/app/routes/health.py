"""System health, status, and root endpoints.

Authors: Muhammed Jalahej, Yazen Emino
"""

import logging
from datetime import datetime

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

_ai_specialist = None
_llm_service = None
_diabetes_model = None
_app_start_time = datetime.utcnow()

APP_VERSION = "4.0.0"


def init(ai_specialist, llm_service, diabetes_model, app_start_time):
    global _ai_specialist, _llm_service, _diabetes_model, _app_start_time
    _ai_specialist = ai_specialist
    _llm_service = llm_service
    _diabetes_model = diabetes_model
    _app_start_time = app_start_time


def _llm_connected() -> bool:
    return bool(_ai_specialist and _ai_specialist.client)


def _model_loaded() -> bool:
    return bool(_diabetes_model and _diabetes_model.model is not None)


@router.get("/")
async def root():
    return {
        "message": "Insulyn AI - Type 2 Diabetes Early Detection Platform",
        "status": "operational",
        "version": APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "llm_status": "connected" if _llm_connected() else "disconnected",
        "ml_model": "loaded" if _model_loaded() else "fallback (rule-based)",
        "endpoints": {
            "chat": "/api/v1/chat",
            "assessment": "/api/v1/diabetes-assessment",
            "diet_plan": "/api/v1/diet-plan/generate",
            "emergency": "/api/v1/emergency-assessment",
            "topics": "/api/v1/health-topics",
            "voice_chat": "/api/v1/voice-chat",
        },
    }


@router.get("/health")
async def health_check():
    uptime = datetime.utcnow() - _app_start_time
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "llm_service": "connected" if _llm_connected() else "disconnected",
            "ml_model": "loaded" if _model_loaded() else "not loaded",
            "scaler": "available" if (_diabetes_model and _diabetes_model.scaler) else "none",
            "api": "operational",
        },
        "uptime_seconds": round(uptime.total_seconds(), 1),
    }


@router.get("/api/v1/system/status")
async def system_status():
    model_info = {
        "status": "loaded" if _model_loaded() else "not loaded",
        "type": "diabetes_risk_assessment",
    }
    if _model_loaded():
        model_info["algorithm"] = type(_diabetes_model.model).__name__
        model_info["scaler"] = "StandardScaler" if _diabetes_model.scaler else "none"
        model_info["features"] = len(_diabetes_model.feature_names)

    return {
        "llm": {
            "status": "connected" if _llm_connected() else "disconnected",
            "provider": "Groq",
        },
        "ml_model": model_info,
        "memory": {
            "active_users": len(_ai_specialist.user_profiles) if _ai_specialist else 0,
            "total_conversations": (
                sum(len(c) for c in _ai_specialist.conversation_memory.values())
                if _ai_specialist else 0
            ),
        },
        "version": APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/api/v1/health")
async def api_health():
    return {
        "status": "healthy",
        "service": "Insulyn AI",
        "version": APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "llm_available": _llm_service.available if _llm_service else False,
        "ml_model_loaded": _model_loaded(),
    }
