"""
Insulyn AI - Type 2 Diabetes Early Detection Platform
Backend entry point.

Authors: Muhammed Jalahej, Yazen Emino
"""

import os
import logging
import pickle
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global timing
# ---------------------------------------------------------------------------
app_start_time = datetime.utcnow()

# ---------------------------------------------------------------------------
# ML Model  (simple inline loader – will be replaced in Phase 2)
# ---------------------------------------------------------------------------
class DiabetesMLModel:
    """Load and run the trained diabetes model from best_model.pkl."""

    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        model_path = os.getenv("MODEL_PATH", "data/best_model.pkl")
        try:
            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                logger.info(f"ML model loaded from {model_path}")
            else:
                logger.warning(f"Model file not found at {model_path}, using rule-based fallback")
        except Exception as e:
            logger.error(f"Model loading failed: {e}")
            self.model = None

    def predict(self, features: Dict[str, Any]) -> tuple:
        feature_names = [
            "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
            "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
        ]
        feature_values = [
            features.get("Pregnancies", 0),
            features.get("Glucose", 100),
            features.get("BloodPressure", 120),
            features.get("SkinThickness", 20),
            features.get("Insulin", 80),
            features.get("BMI", 25),
            features.get("DiabetesPedigreeFunction", 0.5),
            features.get("Age", 30),
        ]
        if self.model and hasattr(self.model, "predict_proba"):
            try:
                X = np.array([feature_values])
                probability = float(self.model.predict_proba(X)[0][1])
                if probability >= 0.7:
                    risk_label = "High Risk"
                elif probability >= 0.4:
                    risk_label = "Moderate Risk"
                elif probability >= 0.2:
                    risk_label = "Low Risk"
                else:
                    risk_label = "Very Low Risk"
                if hasattr(self.model, "feature_importances_"):
                    fi = dict(zip(feature_names, self.model.feature_importances_))
                else:
                    fi = {"Glucose": 0.35, "BMI": 0.25, "Age": 0.15, "BloodPressure": 0.10,
                          "DiabetesPedigreeFunction": 0.08, "Pregnancies": 0.05,
                          "SkinThickness": 0.01, "Insulin": 0.01}
                logger.info(f"ML Prediction: {risk_label} (probability: {probability:.3f})")
                return risk_label, probability, fi
            except Exception as e:
                logger.error(f"Prediction error: {e}")
                return self._rule_based_risk(features)
        return self._rule_based_risk(features)

    def _rule_based_risk(self, features: Dict[str, Any]) -> tuple:
        risk_score = 0.0
        g = features.get("Glucose", 100)
        b = features.get("BMI", 25)
        a = features.get("Age", 30)
        bp = features.get("BloodPressure", 120)
        if g >= 126:   risk_score += 0.6
        elif g >= 100: risk_score += 0.3
        else:          risk_score += 0.1
        if b >= 30:    risk_score += 0.5
        elif b >= 25:  risk_score += 0.3
        else:          risk_score += 0.1
        if a >= 45:    risk_score += 0.3
        elif a >= 35:  risk_score += 0.2
        else:          risk_score += 0.1
        if bp >= 140:  risk_score += 0.4
        elif bp >= 130: risk_score += 0.2
        else:          risk_score += 0.1
        probability = min(0.95, risk_score / 2.0)
        if probability >= 0.7:   risk_label = "High Risk"
        elif probability >= 0.4: risk_label = "Moderate Risk"
        else:                    risk_label = "Low Risk"
        return risk_label, probability, {"Glucose": 0.3, "BMI": 0.25, "Age": 0.2, "BloodPressure": 0.25}


# ---------------------------------------------------------------------------
# Service instantiation
# ---------------------------------------------------------------------------
from app.services.ai_specialist import AIDiabetesSpecialist, GPTOSSDiabetesSpecialist
from app.services.diet import GroqLLMService, ProductionMealPlanningService
from app.services.voice_chat import VoiceChatService

ai_specialist = AIDiabetesSpecialist()
gpt_oss_specialist = GPTOSSDiabetesSpecialist()
diabetes_model = DiabetesMLModel()
llm_service = GroqLLMService()
meal_service = ProductionMealPlanningService(llm_service)
voice_service = VoiceChatService()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[START] Starting Insulyn AI Platform")
    logger.info(f"   LLM Status: {'Connected' if ai_specialist.client else 'Disconnected'}")
    logger.info(f"   ML Model:   {'Loaded' if diabetes_model.model else 'Rule-based fallback'}")
    yield
    logger.info("[STOP] Shutting down Insulyn AI Platform")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Insulyn AI",
    description="Type 2 Diabetes Early Detection Platform - AI-Powered Health Insights",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Wire up routes
# ---------------------------------------------------------------------------
from app.routes import chat, assessment, diet, emergency, health, topics, user, voice_chat, language

# Inject service instances into route modules
chat.init(ai_specialist)
assessment.init(ai_specialist, diabetes_model)
diet.init(meal_service)
health.init(ai_specialist, llm_service, app_start_time)
user.init(ai_specialist)
voice_chat.init(voice_service, gpt_oss_specialist)

# Include all routers under /api/v1 prefix (except root / health which are top-level)
app.include_router(health.router)                          # /, /health, /api/v1/*
app.include_router(chat.router, prefix="/api/v1")          # /api/v1/chat
app.include_router(assessment.router, prefix="/api/v1")    # /api/v1/diabetes-assessment
app.include_router(diet.router, prefix="/api/v1")          # /api/v1/diet-plan/generate
app.include_router(emergency.router, prefix="/api/v1")     # /api/v1/emergency-assessment
app.include_router(topics.router, prefix="/api/v1")        # /api/v1/health-topics
app.include_router(user.router, prefix="/api/v1")          # /api/v1/user/*
app.include_router(voice_chat.router, prefix="/api/v1")    # /api/v1/voice-chat
app.include_router(language.router, prefix="/api/v1")      # /api/v1/detect-language


# ---------------------------------------------------------------------------
# Error handler
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.utcnow().isoformat(),
            "path": request.url.path,
        },
    )


# ---------------------------------------------------------------------------
# Production entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("RELOAD", "True").lower() == "true",
        log_level="info",
    )
