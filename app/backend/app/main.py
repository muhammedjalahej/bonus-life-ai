"""
More Life AI - Type 2 Diabetes Early Detection Platform
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

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

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
    """Load and run the trained diabetes model from a bundled .pkl artifact.

    The bundle is a dict: {"model": <sklearn model>, "scaler": <StandardScaler>, "feature_names": [...]}
    Saved by scripts/train_model.py.
    """

    FEATURE_MAP = {
        # maps incoming key -> lower-case feature name used by the training script
        "Pregnancies": "pregnancies",
        "Glucose": "glucose",
        "BloodPressure": "blood_pressure",
        "SkinThickness": "skin_thickness",
        "Insulin": "insulin",
        "BMI": "bmi",
        "DiabetesPedigreeFunction": "diabetes_pedigree_function",
        "Age": "age",
    }

    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = list(self.FEATURE_MAP.keys())  # PascalCase order
        self.load_model()

    def load_model(self):
        model_path = os.getenv("MODEL_PATH", "data/best_model.pkl")
        try:
            if not os.path.exists(model_path):
                logger.warning(f"Model file not found at {model_path}, using rule-based fallback")
                return

            with open(model_path, "rb") as f:
                artifact = pickle.load(f)

            # Support both bundle dict and raw model
            if isinstance(artifact, dict) and "model" in artifact:
                self.model = artifact["model"]
                self.scaler = artifact.get("scaler")
                stored_names = artifact.get("feature_names")
                if stored_names:
                    self.feature_names = [
                        next((k for k, v in self.FEATURE_MAP.items() if v == n), n)
                        for n in stored_names
                    ]
                logger.info(f"Model bundle loaded from {model_path} (scaler={'yes' if self.scaler else 'no'})")
            else:
                # Legacy: raw sklearn model (no scaler)
                self.model = artifact
                logger.info(f"Legacy model loaded from {model_path} (no scaler)")

        except Exception as e:
            logger.error(f"Model loading failed: {e}")
            self.model = None

    def predict(self, features: Dict[str, Any]) -> tuple:
        feature_values = [
            features.get(fn, 0) for fn in self.feature_names
        ]

        if self.model and hasattr(self.model, "predict_proba"):
            try:
                X = np.array([feature_values])

                # Apply scaler if available
                if self.scaler is not None:
                    X = self.scaler.transform(X)

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
                    fi = dict(zip(self.feature_names, self.model.feature_importances_))
                else:
                    fi = {fn: round(1.0 / len(self.feature_names), 3) for fn in self.feature_names}

                logger.info(f"ML Prediction: {risk_label} (probability: {probability:.3f})")
                return risk_label, probability, fi

            except Exception as e:
                logger.error(f"Prediction error: {e}")
                return self._rule_based_risk(features)

        return self._rule_based_risk(features)

    def explain(self, features: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """Return per-feature SHAP values for a single prediction (explainable AI)."""
        if not SHAP_AVAILABLE or self.model is None:
            return None
        try:
            feature_values = [features.get(fn, 0) for fn in self.feature_names]
            X = np.array([feature_values])
            if self.scaler is not None:
                X = self.scaler.transform(X)

            explainer = shap.TreeExplainer(self.model)
            sv = explainer.shap_values(X)
            # For binary classifiers sv may be [class0, class1]
            vals = sv[1][0] if isinstance(sv, list) else sv[0]
            return {fn: round(float(v), 4) for fn, v in zip(self.feature_names, vals)}
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")
            return None

    def _rule_based_risk(self, features: Dict[str, Any]) -> tuple:
        g = features.get("Glucose", 100)
        b = features.get("BMI", 25)
        a = features.get("Age", 30)
        bp = features.get("BloodPressure", 120)
        risk_score = 0.0
        if g >= 126:    risk_score += 0.6
        elif g >= 100:  risk_score += 0.3
        else:           risk_score += 0.1
        if b >= 30:     risk_score += 0.5
        elif b >= 25:   risk_score += 0.3
        else:           risk_score += 0.1
        if a >= 45:     risk_score += 0.3
        elif a >= 35:   risk_score += 0.2
        else:           risk_score += 0.1
        if bp >= 140:   risk_score += 0.4
        elif bp >= 130: risk_score += 0.2
        else:           risk_score += 0.1
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
    logger.info("[START] Starting More Life AI Platform")
    logger.info(f"   LLM Status: {'Connected' if ai_specialist.client else 'Disconnected'}")
    logger.info(f"   ML Model:   {'Loaded' if diabetes_model.model else 'Rule-based fallback'}")
    yield
    logger.info("[STOP] Shutting down More Life AI Platform")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="More Life AI",
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
health.init(ai_specialist, llm_service, diabetes_model, app_start_time)
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
