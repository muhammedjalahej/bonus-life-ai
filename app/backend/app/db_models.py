"""
SQLAlchemy ORM models.
Authors: Muhammed Jalahej, Yazen Emino
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


# ---- Audit Log ----
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_email = Column(String(255), default="")
    action = Column(String(100), nullable=False)  # e.g. "delete_user", "change_role"
    target_type = Column(String(50), default="")  # e.g. "user", "announcement"
    target_id = Column(Integer, nullable=True)
    target_label = Column(String(255), default="")  # e.g. user email
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


# ---- Announcements ----
class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---- Site Settings / Feature Flags ----
class SiteSetting(Base):
    __tablename__ = "site_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(String(500), default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="")
    avatar_url = Column(String(512), nullable=True)  # Profile picture URL
    role = Column(String(50), default="user")  # user | admin
    is_active = Column(Boolean, default=True)
    preferred_language = Column(String(20), default="english")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Password reset (for forgot-password flow)
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime, nullable=True)
    # Diet preferences (feature f8)
    dietary_preference = Column(String(50), default="")   # vegetarian, vegan, etc.
    allergies = Column(String(500), default="")            # comma-separated
    calorie_goal = Column(Integer, nullable=True)
    # Admin notes (feature f12)
    admin_notes = Column(Text, default="")
    # 2FA (feature f15)
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False)
    # Onboarding (feature f2)
    onboarding_completed = Column(Boolean, default=False)

    assessments = relationship("Assessment", back_populates="user")
    diet_plans = relationship("DietPlanRecord", back_populates="user")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, default="")
    type = Column(String(50), default="info")  # info, warning, success, reminder
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(String(64), unique=True, index=True)
    risk_level = Column(String(64))
    probability = Column(Float)
    executive_summary = Column(Text, default="")
    payload = Column(Text)  # JSON string of request/response summary
    created_at = Column(DateTime, default=datetime.utcnow)
    # Share token for sharing with doctor (feature f16)
    share_token = Column(String(64), nullable=True, unique=True, index=True)

    user = relationship("User", back_populates="assessments")


class DietPlanRecord(Base):
    __tablename__ = "diet_plan_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal = Column(String(128), default="")
    overview = Column(Text, default="")
    payload = Column(Text)  # JSON string of full response
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="diet_plans")
