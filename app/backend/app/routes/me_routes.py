"""User-scoped routes: my assessments, my diet plans, profile."""

import json
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User, Assessment, DietPlanRecord
from app.models import UserMeResponse, ProfileUpdateRequest, ChangePasswordRequest
from app.auth import get_current_user, hash_password

logger = logging.getLogger(__name__)
router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserMeResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role or "user",
        preferred_language=user.preferred_language or "english",
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.patch("/users/me", response_model=UserMeResponse)
async def update_me(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.preferred_language is not None:
        user.preferred_language = data.preferred_language.strip()
    db.commit()
    db.refresh(user)
    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role or "user",
        preferred_language=user.preferred_language or "english",
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/users/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.auth import verify_password
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated"}


@router.get("/users/me/assessments")
async def my_assessments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
) -> List[dict]:
    rows = (
        db.query(Assessment)
        .filter(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "assessment_id": r.assessment_id,
            "risk_level": r.risk_level,
            "probability": r.probability,
            "executive_summary": r.executive_summary,
            "payload": json.loads(r.payload) if r.payload else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/users/me/diet-plans")
async def my_diet_plans(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
) -> List[dict]:
    rows = (
        db.query(DietPlanRecord)
        .filter(DietPlanRecord.user_id == user.id)
        .order_by(DietPlanRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "goal": r.goal,
            "overview": r.overview,
            "payload": json.loads(r.payload) if r.payload else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
