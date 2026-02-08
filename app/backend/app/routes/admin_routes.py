"""Admin-only routes: users list, stats, assessments."""

import json
import logging
from typing import List, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.db_models import User, Assessment, DietPlanRecord
from app.auth import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def admin_list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> List[dict]:
    rows = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name or "",
            "role": u.role,
            "is_active": u.is_active,
            "preferred_language": u.preferred_language or "english",
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]


@router.get("/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_assessments = db.query(func.count(Assessment.id)).scalar() or 0
    total_diet_plans = db.query(func.count(DietPlanRecord.id)).scalar() or 0
    return {
        "total_users": total_users,
        "total_assessments": total_assessments,
        "total_diet_plans": total_diet_plans,
    }


@router.get("/assessments")
async def admin_list_assessments(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> List[dict]:
    rows = (
        db.query(Assessment)
        .order_by(Assessment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for r in rows:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_email": user.email if user else None,
            "assessment_id": r.assessment_id,
            "risk_level": r.risk_level,
            "probability": r.probability,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result
