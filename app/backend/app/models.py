"""Pydantic models for all API request/response schemas.

Authors: Muhammed Jalahej, Yazen Emino
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from datetime import datetime


# ---------------------------------------------------------------
# Chat
# ---------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "english"
    user_id: Optional[str] = "default"
    user_context: Optional[str] = None  # Latest assessment context for personalized responses


class ChatResponse(BaseModel):
    response: str
    timestamp: str
    conversation_id: str
    model: str
    error_detail: Optional[str] = None  # only in development when LLM fails


# ---------------------------------------------------------------
# Diabetes Assessment
# ---------------------------------------------------------------
class DiabetesAssessmentRequest(BaseModel):
    glucose: float = Field(..., ge=0, le=500, description="Glucose level in mg/dL")
    blood_pressure: float = Field(..., ge=0, le=300, description="Blood pressure in mmHg")
    weight: float = Field(..., ge=20, le=300, description="Weight in kg")
    height: float = Field(..., ge=50, le=250, description="Height in cm")
    age: int = Field(..., ge=1, le=120, description="Age in years")
    pregnancies: Optional[int] = Field(0, ge=0, le=20, description="Number of pregnancies")
    skin_thickness: Optional[float] = Field(20.0, ge=0, le=100, description="Skin thickness in mm")
    insulin: Optional[float] = Field(80.0, ge=0, le=900, description="Insulin level in mu U/ml")
    diabetes_pedigree_function: Optional[float] = Field(0.5, ge=0, le=3.0, description="Diabetes pedigree function")
    language: Optional[str] = Field("english", description="Response language")


class AssessmentResponse(BaseModel):
    assessment_id: str
    timestamp: str
    executive_summary: str
    risk_analysis: Dict[str, Any]
    health_metrics: Dict[str, Any]
    recommendations: Dict[str, Any]


# ---------------------------------------------------------------
# Diet Plan
# ---------------------------------------------------------------
class DietPlanRequest(BaseModel):
    age: int
    weight: float
    height: float
    gender: str
    dietaryPreference: str = "balanced"
    healthConditions: str = ""
    activityLevel: str = "moderate"
    goals: str = "diabetes_prevention"
    allergies: str = ""
    typicalDay: str = ""
    language: str = "english"


class DietPlanResponse(BaseModel):
    overview: str
    daily_plan: str
    grocery_list: str
    important_notes: str
    nutritional_info: Dict[str, Any] = {}
    timestamp: str
    status: str = "success"
    generation_time: float = 0.0


class SaveDietPlanRequest(BaseModel):
    """Save an existing plan to the user's account (e.g. from mobile after viewing)."""
    goal: str = ""
    overview: str = ""
    payload: Dict[str, Any] = Field(..., description="Full plan object (overview, daily_plan, etc.)")


# ---------------------------------------------------------------
# Meal Photo Analyzer
# ---------------------------------------------------------------
class MealPhotoAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded meal image (optional data URL prefix)")
    save_to_log: bool = Field(False, description="If true and user logged in, save this meal to their log")


class MealPhotoAnalyzeResponse(BaseModel):
    meal_name: str
    carb_level: str  # low | medium | high
    healthier_swaps: str
    saved_to_log: bool = False


# ---------------------------------------------------------------
# Emergency Assessment
# ---------------------------------------------------------------
class EmergencyAssessmentRequest(BaseModel):
    symptoms: List[str]
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    existing_conditions: List[str] = []
    current_medications: List[str] = []
    last_meal_time: Optional[str] = None
    language: str = "english"


class EmergencyAssessmentResponse(BaseModel):
    assessment: str
    personalized_analysis: str
    recommendations: List[str]
    urgency_level: str
    risk_factors: List[str]
    next_steps: List[str]
    timestamp: str


# ---------------------------------------------------------------
# Voice Chat
# ---------------------------------------------------------------
class VoiceChatRequest(BaseModel):
    audio_data: str
    language: str = "english"
    user_id: str = "default"


class VoiceChatResponse(BaseModel):
    text_input: str
    ai_response: str
    timestamp: str
    language: str
    confidence: float


# ---------------------------------------------------------------
# ML Model (used by ml_model.py / prediction pipeline)
# ---------------------------------------------------------------
class DiabetesInput(BaseModel):
    pregnancies: int = Field(..., ge=0, le=20, description="Number of pregnancies")
    glucose: float = Field(..., ge=0, le=200, description="Glucose level in mg/dL")
    blood_pressure: float = Field(..., ge=0, le=122, description="Blood pressure in mmHg")
    skin_thickness: float = Field(..., ge=0, le=99, description="Skin thickness in mm")
    insulin: float = Field(..., ge=0, le=846, description="Insulin level in mu U/ml")
    weight: float = Field(..., ge=20, le=200, description="Weight in kg")
    height: float = Field(..., ge=0.5, le=2.5, description="Height in meters")
    diabetes_pedigree_function: float = Field(..., ge=0.08, le=2.42, description="Diabetes pedigree function")
    age: int = Field(..., ge=21, le=81, description="Age in years")

    @validator("height")
    def validate_height(cls, v):
        if v <= 0:
            raise ValueError("Height must be positive")
        return v

    @property
    def bmi(self) -> float:
        return round(self.weight / (self.height ** 2), 1)


class MLModelOutput(BaseModel):
    risk_label: str = Field(..., description="Risk label")
    probability: float = Field(..., ge=0.0, le=1.0, description="Probability of diabetes")
    feature_importances: Optional[Dict[str, float]] = Field(None, description="Feature importance scores")
    calculated_bmi: float = Field(..., description="BMI calculated from weight and height")


class LLMAdviceResponse(BaseModel):
    risk_summary: str
    clinical_interpretation: List[str]
    recommendations: Dict[str, str]
    prevention_tips: List[str]
    monitoring_plan: List[str]
    clinician_message: str
    feature_explanation: str
    safety_note: str

    @validator("recommendations", pre=True)
    def validate_recommendations(cls, v):
        if isinstance(v, dict):
            for key, value in v.items():
                if isinstance(value, list):
                    v[key] = "\n".join(
                        [f"- {item}" if not item.startswith("-") else item for item in value]
                    )
                elif not isinstance(value, str):
                    v[key] = str(value)
        return v


class CombinedResponse(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ml_output: MLModelOutput
    llm_advice: LLMAdviceResponse
    bmi_category: str = Field(..., description="Underweight, Normal, Overweight, or Obese")


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User's message")
    conversation_context: Optional[str] = Field(None, description="Previous conversation context")


class HealthMetrics(BaseModel):
    status: str
    timestamp: datetime
    version: str
    uptime_seconds: float
    services: Dict[str, bool]
    metrics: Dict[str, Any]


class ErrorResponse(BaseModel):
    detail: str


# ---------------------------------------------------------------
# Auth
# ---------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserMeResponse(BaseModel):
    id: int
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    preferred_language: str
    is_active: bool
    created_at: Optional[datetime] = None
    # Diet preferences
    dietary_preference: str = ""
    allergies: str = ""
    calorie_goal: Optional[int] = None
    # 2FA
    totp_enabled: bool = False
    # Onboarding
    onboarding_completed: bool = False


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    avatar_url: Optional[str] = None
    # Diet preferences
    dietary_preference: Optional[str] = None
    allergies: Optional[str] = None
    calorie_goal: Optional[int] = None
    # Onboarding
    onboarding_completed: Optional[bool] = None


class AdminUserUpdateRequest(BaseModel):
    """Admin can update user role and active status."""
    role: Optional[str] = None  # "user" or "admin"
    is_active: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------------------------------------------------------
# Admin: Create user, Bulk actions, Announcements, Settings
# ---------------------------------------------------------------
class AdminCreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""
    role: str = "user"

class AdminBulkActionRequest(BaseModel):
    user_ids: List[int]
    action: str  # "deactivate", "activate", "delete"

class AnnouncementRequest(BaseModel):
    title: str
    message: str
    is_active: bool = True

class SiteSettingUpdate(BaseModel):
    key: str
    value: str


class AdminSendEmailRequest(BaseModel):
    subject: str
    body: str


class AdminBulkEmailRequest(BaseModel):
    subject: str
    body: str
    user_ids: Optional[List[int]] = None  # None = all users
    role_filter: Optional[str] = None     # "user" | "admin"


class AdminUserNotesRequest(BaseModel):
    admin_notes: str


class TOTPSetupResponse(BaseModel):
    secret: str
    uri: str


class TOTPVerifyRequest(BaseModel):
    code: str
