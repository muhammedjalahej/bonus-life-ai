"""
SQLAlchemy ORM models for User, Assessment, DietPlanRecord.
Authors: Muhammed Jalahej, Yazen Emino
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="")
    role = Column(String(50), default="user")  # user | admin
    is_active = Column(Boolean, default=True)
    preferred_language = Column(String(20), default="english")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessments = relationship("Assessment", back_populates="user")
    diet_plans = relationship("DietPlanRecord", back_populates="user")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assessment_id = Column(String(64), unique=True, index=True)
    risk_level = Column(String(64))
    probability = Column(Float)
    executive_summary = Column(Text, default="")
    payload = Column(Text)  # JSON string of request/response summary
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="assessments")


class DietPlanRecord(Base):
    __tablename__ = "diet_plan_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal = Column(String(128), default="")
    overview = Column(Text, default="")
    payload = Column(Text)  # JSON string of full response
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="diet_plans")
