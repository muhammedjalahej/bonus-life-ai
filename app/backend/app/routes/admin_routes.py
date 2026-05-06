"""Admin-only routes: users, stats, assessments, audit, announcements, settings, email."""

import json
import secrets
import logging
from typing import List, Optional
from datetime import datetime, timedelta


def _safe_json(s):
    """Parse a JSON string, returning None on any error (handles corrupted DB payloads)."""
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        return None

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.db_models import User, Assessment, HeartAssessment, DietPlanRecord, AuditLog, Announcement, SiteSetting, BrainMriAnalysis, CKDAssessment
from app.auth import require_admin, hash_password
from app.services.notification_service import create_notification
from app.models import (
    AdminUserUpdateRequest, AdminCreateUserRequest, AdminBulkActionRequest,
    AnnouncementRequest, SiteSettingUpdate, AdminSendEmailRequest,
    AdminBulkEmailRequest, AdminUserNotesRequest, AdminResetPasswordRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Helper: write audit log
# ---------------------------------------------------------------------------
def _audit(db: Session, admin: User, action: str, target_type: str = "",
           target_id: int = None, target_label: str = "", details: str = ""):
    db.add(AuditLog(
        admin_id=admin.id, admin_email=admin.email, action=action,
        target_type=target_type, target_id=target_id,
        target_label=target_label, details=details,
    ))
    db.commit()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users")
async def admin_list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    rows = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": u.id, "email": u.email, "full_name": u.full_name or "",
            "avatar_url": u.avatar_url, "role": u.role, "is_active": u.is_active,
            "preferred_language": u.preferred_language or "english",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "admin_notes": u.admin_notes or "",
        }
        for u in rows
    ]


@router.post("/users")
async def admin_create_user(
    data: AdminCreateUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Admin creates a new user with email + password."""
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    if data.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'.")
    user = User(
        email=email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _audit(db, admin, "create_user", "user", user.id, email)
    logger.info(f"Admin {admin.id} created user {user.id} ({email})")
    return {"message": "User created.", "user": {"id": user.id, "email": email, "role": user.role}}


@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: int, data: AdminUserUpdateRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if data.role is not None and admin.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")
    changes = []
    if data.role is not None:
        if data.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'.")
        changes.append(f"role: {user.role} → {data.role}")
        user.role = data.role
    if data.is_active is not None:
        changes.append(f"active: {user.is_active} → {data.is_active}")
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    _audit(db, admin, "update_user", "user", user_id, user.email, "; ".join(changes))
    return {"message": "User updated.", "user": {"id": user.id, "email": user.email, "role": user.role, "is_active": user.is_active}}


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    email = user.email
    db.query(Assessment).filter(Assessment.user_id == user_id).delete()
    db.query(DietPlanRecord).filter(DietPlanRecord.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    _audit(db, admin, "delete_user", "user", user_id, email)
    return {"message": "User deleted."}


@router.post("/users/bulk")
async def admin_bulk_action(
    data: AdminBulkActionRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    if data.action not in ("activate", "deactivate", "delete"):
        raise HTTPException(status_code=400, detail="Action must be activate, deactivate, or delete.")
    # Remove admin's own id from the list
    ids = [i for i in data.user_ids if i != admin.id]
    if not ids:
        return {"message": "No users to update.", "affected": 0}

    if data.action == "delete":
        db.query(Assessment).filter(Assessment.user_id.in_(ids)).delete(synchronize_session=False)
        db.query(DietPlanRecord).filter(DietPlanRecord.user_id.in_(ids)).delete(synchronize_session=False)
        count = db.query(User).filter(User.id.in_(ids)).delete(synchronize_session=False)
    elif data.action == "deactivate":
        count = db.query(User).filter(User.id.in_(ids)).update({"is_active": False}, synchronize_session=False)
    else:
        count = db.query(User).filter(User.id.in_(ids)).update({"is_active": True}, synchronize_session=False)
    db.commit()
    _audit(db, admin, f"bulk_{data.action}", "user", details=f"ids={ids}, affected={count}")
    return {"message": f"Bulk {data.action} complete.", "affected": count}


# ---------------------------------------------------------------------------
# User Profile (detailed, for admin)
# ---------------------------------------------------------------------------
@router.get("/users/{user_id}/profile")
async def admin_get_user_profile(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    diabetes = db.query(func.count(Assessment.id)).filter(Assessment.user_id == user_id).scalar() or 0
    heart    = db.query(func.count(HeartAssessment.id)).filter(HeartAssessment.user_id == user_id).scalar() or 0
    ckd      = db.query(func.count(CKDAssessment.id)).filter(CKDAssessment.user_id == user_id).scalar() or 0
    brain    = db.query(func.count(BrainMriAnalysis.id)).filter(BrainMriAnalysis.user_id == user_id).scalar() or 0
    diet     = db.query(func.count(DietPlanRecord.id)).filter(DietPlanRecord.user_id == user_id).scalar() or 0
    activity = {"diabetes": diabetes, "heart": heart, "ckd": ckd, "brain_mri": brain, "diet_plans": diet}
    total_tests = sum(activity.values())
    most_used = max(activity, key=activity.get) if total_tests > 0 else None
    most_used_labels = {"diabetes": "Diabetes Test", "heart": "Heart Test", "ckd": "CKD Test", "brain_mri": "Brain MRI", "diet_plans": "Diet Plans"}
    return {
        "id": user.id, "email": user.email, "full_name": user.full_name or "",
        "role": user.role, "is_active": user.is_active,
        "preferred_language": user.preferred_language or "english",
        "avatar_url": user.avatar_url, "admin_notes": user.admin_notes or "",
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "subscription_tier": getattr(user, "subscription_tier", "free") or "free",
        "subscription_status": getattr(user, "subscription_status", "") or "",
        "stripe_customer_id": getattr(user, "stripe_customer_id", None),
        "activity": activity,
        "total_tests": total_tests,
        "most_used": most_used_labels.get(most_used) if most_used else "—",
    }


# ---------------------------------------------------------------------------
# Admin: reset any user's password
# ---------------------------------------------------------------------------
@router.post("/users/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: int, data: AdminResetPasswordRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    _audit(db, admin, "reset_password", "user", user_id, user.email)
    return {"message": "Password reset successfully."}


# ---------------------------------------------------------------------------
# Stats & Charts
# ---------------------------------------------------------------------------
@router.get("/stats")
async def admin_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    from datetime import datetime, timedelta
    total_users = db.query(func.count(User.id)).filter(User.role == "user").scalar() or 0
    total_assessments = db.query(func.count(Assessment.id)).scalar() or 0
    total_diet_plans = db.query(func.count(DietPlanRecord.id)).scalar() or 0
    total_brain_mri = db.query(func.count(BrainMriAnalysis.id)).scalar() or 0
    total_ckd = db.query(func.count(CKDAssessment.id)).scalar() or 0
    total_heart = db.query(func.count(HeartAssessment.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    admin_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    # New this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_this_month = db.query(func.count(User.id)).filter(User.created_at >= month_start).scalar() or 0
    new_assessments_this_month = (
        (db.query(func.count(Assessment.id)).filter(Assessment.created_at >= month_start).scalar() or 0) +
        (db.query(func.count(HeartAssessment.id)).filter(HeartAssessment.created_at >= month_start).scalar() or 0) +
        (db.query(func.count(CKDAssessment.id)).filter(CKDAssessment.created_at >= month_start).scalar() or 0) +
        (db.query(func.count(BrainMriAnalysis.id)).filter(BrainMriAnalysis.created_at >= month_start).scalar() or 0) +
        (db.query(func.count(DietPlanRecord.id)).filter(DietPlanRecord.created_at >= month_start).scalar() or 0)
    )
    # Risk counts
    high_risk_diabetes = db.query(func.count(Assessment.id)).filter(Assessment.risk_level.ilike("%high%")).scalar() or 0
    high_risk_heart = db.query(func.count(HeartAssessment.id)).filter(HeartAssessment.risk_level.ilike("%high%")).scalar() or 0
    positive_ckd = db.query(func.count(CKDAssessment.id)).filter(CKDAssessment.prediction == "CKD").scalar() or 0
    brain_tumor_detected = db.query(func.count(BrainMriAnalysis.id)).filter(BrainMriAnalysis.tumor_class != "no tumor").scalar() or 0
    return {
        "total_users": total_users, "active_users": active_users, "admin_count": admin_count,
        "total_assessments": total_assessments, "total_diet_plans": total_diet_plans,
        "total_brain_mri": total_brain_mri, "total_ckd": total_ckd, "total_heart": total_heart,
        "new_users_this_month": new_users_this_month,
        "new_assessments_this_month": new_assessments_this_month,
        "high_risk_diabetes": high_risk_diabetes,
        "high_risk_heart": high_risk_heart,
        "positive_ckd": positive_ckd,
        "brain_tumor_detected": brain_tumor_detected,
    }


@router.get("/stats/charts")
async def admin_chart_data(admin: User = Depends(require_admin), db: Session = Depends(get_db), days: int = 30) -> dict:
    """Data for charts: users and assessments over time, risk distribution."""
    from sqlalchemy import text as sa_text
    since = datetime.utcnow() - timedelta(days=days)
    since_str = since.strftime("%Y-%m-%d")

    # Use SQLite-safe date() function instead of cast(..., Date)
    try:
        user_rows = db.execute(sa_text(
            "SELECT date(created_at) AS day, count(*) AS cnt "
            "FROM users WHERE created_at IS NOT NULL AND date(created_at) >= :since "
            "GROUP BY day ORDER BY day"
        ), {"since": since_str}).fetchall()
        users_over_time = [{"date": str(r[0]), "count": r[1]} for r in user_rows if r[0]]
    except Exception:
        users_over_time = []

    try:
        assess_rows = db.execute(sa_text(
            "SELECT date(created_at) AS day, count(*) AS cnt "
            "FROM assessments WHERE created_at IS NOT NULL AND date(created_at) >= :since "
            "GROUP BY day ORDER BY day"
        ), {"since": since_str}).fetchall()
        assessments_over_time = [{"date": str(r[0]), "count": r[1]} for r in assess_rows if r[0]]
    except Exception:
        assessments_over_time = []

    # Risk distribution
    try:
        risk_rows = (
            db.query(Assessment.risk_level, func.count(Assessment.id))
            .group_by(Assessment.risk_level).all()
        )
        risk_distribution = [{"level": r[0] or "Unknown", "count": r[1]} for r in risk_rows]
    except Exception:
        risk_distribution = []

    return {
        "users_over_time": users_over_time,
        "assessments_over_time": assessments_over_time,
        "risk_distribution": risk_distribution,
    }


# ---------------------------------------------------------------------------
# Subscription management (admin only)
# ---------------------------------------------------------------------------
@router.get("/subscriptions/stats")
async def admin_subscription_stats(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    """Aggregate subscription counts by tier and status."""
    total = db.query(func.count(User.id)).scalar() or 0
    free = db.query(func.count(User.id)).filter(
        (User.subscription_tier == "free") | (User.subscription_tier == None)
    ).scalar() or 0
    pro_monthly = db.query(func.count(User.id)).filter(User.subscription_tier == "pro_monthly").scalar() or 0
    pro_yearly = db.query(func.count(User.id)).filter(User.subscription_tier == "pro_yearly").scalar() or 0
    active = db.query(func.count(User.id)).filter(
        User.subscription_status == "active",
        User.subscription_tier != "free",
    ).scalar() or 0
    return {
        "total_users": total,
        "free": free,
        "pro_monthly": pro_monthly,
        "pro_yearly": pro_yearly,
        "active_subscriptions": active,
    }


@router.get("/subscriptions")
async def admin_list_subscriptions(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by subscription_status"),
    tier: Optional[str] = Query(None, description="Filter by subscription_tier"),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    """List users with subscription data for admin management."""
    q = db.query(User).filter(User.role == "user")
    if status:
        q = q.filter(User.subscription_status == status)
    if tier:
        q = q.filter(User.subscription_tier == tier)
    rows = q.order_by(User.updated_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name or "",
            "subscription_tier": u.subscription_tier or "free",
            "subscription_status": u.subscription_status or "",
            "current_period_end": u.current_period_end.isoformat() if u.current_period_end else None,
            "stripe_customer_id": u.stripe_customer_id,
            "stripe_subscription_id": u.stripe_subscription_id,
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
        }
        for u in rows
    ]


# ---------------------------------------------------------------------------
# Assessments
# ---------------------------------------------------------------------------
@router.get("/assessments")
async def admin_list_assessments(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    rows = (
        db.query(Assessment)
        .options(joinedload(Assessment.user))
        .filter(Assessment.admin_hidden == False)
        .order_by(Assessment.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": r.id, "user_id": r.user_id,
            "user_email": r.user.email if r.user else None,
            "user_full_name": (r.user.full_name or "") if r.user else "",
            "assessment_id": r.assessment_id, "risk_level": r.risk_level,
            "probability": r.probability,
            "executive_summary": r.executive_summary or "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# CKD Assessments (admin)
# ---------------------------------------------------------------------------
@router.get("/ckd-assessments")
async def admin_list_ckd_assessments(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    rows = (
        db.query(CKDAssessment)
        .options(joinedload(CKDAssessment.user))
        .filter(CKDAssessment.admin_hidden == False)
        .order_by(CKDAssessment.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": r.id, "user_id": r.user_id,
            "user_email": r.user.email if r.user else None,
            "user_full_name": (r.user.full_name or "") if r.user else "",
            "assessment_id": r.assessment_id,
            "prediction": r.prediction,
            "confidence": r.confidence,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/assessments/{assessment_id}")
async def admin_delete_assessment(
    assessment_id: int,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    """Soft-delete: hide from admin view but preserve user's data."""
    row = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assessment not found")
    row.admin_hidden = True
    db.commit()
    return {"ok": True}


@router.delete("/assessments")
async def admin_clear_assessments(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    """Soft-delete all: hide all from admin view but preserve user data."""
    db.query(Assessment).filter(Assessment.admin_hidden == False).update({"admin_hidden": True})
    db.commit()
    return {"ok": True}


@router.delete("/ckd-assessments/{assessment_id}")
async def admin_delete_ckd_assessment(
    assessment_id: int,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    """Soft-delete: hide from admin view but preserve user's data."""
    row = db.query(CKDAssessment).filter(CKDAssessment.id == assessment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="CKD assessment not found")
    row.admin_hidden = True
    db.commit()
    return {"ok": True}


@router.delete("/ckd-assessments")
async def admin_clear_ckd_assessments(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    """Soft-delete all: hide all from admin view but preserve user data."""
    db.query(CKDAssessment).filter(CKDAssessment.admin_hidden == False).update({"admin_hidden": True})
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Heart Assessments (admin)
# ---------------------------------------------------------------------------
@router.get("/heart-assessments")
async def admin_list_heart_assessments(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    rows = (
        db.query(HeartAssessment)
        .options(joinedload(HeartAssessment.user))
        .filter(HeartAssessment.admin_hidden == False)
        .order_by(HeartAssessment.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": r.id, "user_id": r.user_id,
            "user_email": r.user.email if r.user else None,
            "user_full_name": (r.user.full_name or "") if r.user else "",
            "assessment_id": r.assessment_id, "risk_level": r.risk_level,
            "probability": r.probability,
            "executive_summary": r.executive_summary or "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/heart-assessments/{assessment_id}")
async def admin_delete_heart_assessment(
    assessment_id: int,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    row = db.query(HeartAssessment).filter(HeartAssessment.id == assessment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.admin_hidden = True
    db.commit()
    return {"ok": True}


@router.delete("/heart-assessments")
async def admin_clear_heart_assessments(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    db.query(HeartAssessment).filter(HeartAssessment.admin_hidden == False).update({"admin_hidden": True})
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Brain MRI Analyses (admin)
# ---------------------------------------------------------------------------
@router.get("/brain-mri-analyses")
async def admin_list_brain_mri(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    rows = (
        db.query(BrainMriAnalysis)
        .options(joinedload(BrainMriAnalysis.user))
        .filter(BrainMriAnalysis.admin_hidden == False)
        .order_by(BrainMriAnalysis.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": r.id, "user_id": r.user_id,
            "user_email": r.user.email if r.user else None,
            "user_full_name": (r.user.full_name or "") if r.user else "",
            "assessment_id": r.assessment_id,
            "tumor_class": r.tumor_class,
            "confidence": r.confidence,
            "executive_summary": r.executive_summary or "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/brain-mri-analyses/{analysis_id}")
async def admin_delete_brain_mri(
    analysis_id: int,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    row = db.query(BrainMriAnalysis).filter(BrainMriAnalysis.id == analysis_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.admin_hidden = True
    db.commit()
    return {"ok": True}


@router.delete("/brain-mri-analyses")
async def admin_clear_brain_mri(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    db.query(BrainMriAnalysis).filter(BrainMriAnalysis.admin_hidden == False).update({"admin_hidden": True})
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Diet Plans (admin)
# ---------------------------------------------------------------------------
@router.get("/diet-plans")
async def admin_list_diet_plans(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    skip: int = 0, limit: int = 500,
) -> List[dict]:
    rows = (
        db.query(DietPlanRecord)
        .options(joinedload(DietPlanRecord.user))
        .filter(DietPlanRecord.admin_hidden == False)
        .order_by(DietPlanRecord.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": r.id, "user_id": r.user_id,
            "user_email": r.user.email if r.user else None,
            "user_full_name": (r.user.full_name or "") if r.user else "",
            "goal": r.goal,
            "overview": (r.overview or "")[:120],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/diet-plans/{plan_id}")
async def admin_delete_diet_plan(
    plan_id: int,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    row = db.query(DietPlanRecord).filter(DietPlanRecord.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.admin_hidden = True
    db.commit()
    return {"ok": True}


@router.delete("/diet-plans")
async def admin_clear_diet_plans(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    db.query(DietPlanRecord).filter(DietPlanRecord.admin_hidden == False).update({"admin_hidden": True})
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------
@router.get("/audit-log")
async def admin_audit_log(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
    skip: int = 0, limit: int = 100,
) -> List[dict]:
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id, "admin_email": r.admin_email, "action": r.action,
            "target_type": r.target_type, "target_id": r.target_id,
            "target_label": r.target_label, "details": r.details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/audit-log/clear")
async def admin_clear_audit_log(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    """Clear all audit log entries."""
    count = db.query(AuditLog).count()
    db.query(AuditLog).delete()
    db.commit()
    logger.info(f"Admin {admin.id} cleared {count} audit log entries")
    return {"message": f"Cleared {count} log entries.", "cleared": count}


# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------
@router.get("/announcements")
async def admin_list_announcements(
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> List[dict]:
    rows = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return [
        {"id": a.id, "title": a.title, "message": a.message, "is_active": a.is_active,
         "created_at": a.created_at.isoformat() if a.created_at else None,
         "expires_at": a.expires_at.isoformat() if getattr(a, "expires_at", None) else None}
        for a in rows
    ]


@router.post("/announcements")
async def admin_create_announcement(
    data: AnnouncementRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    expires_dt = None
    if data.expires_at:
        try:
            expires_dt = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid expires_at format. Use ISO 8601, e.g. 2025-12-31T23:59:00Z",
            )
    ann = Announcement(title=data.title, message=data.message, is_active=data.is_active,
                       created_by=admin.id, expires_at=expires_dt)
    db.add(ann)
    db.commit()
    db.refresh(ann)
    _audit(db, admin, "create_announcement", "announcement", ann.id, data.title)
    return {"message": "Announcement created.", "id": ann.id}


@router.patch("/announcements/{ann_id}")
async def admin_update_announcement(
    ann_id: int, data: AnnouncementRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    ann.title = data.title
    ann.message = data.message
    ann.is_active = data.is_active
    if data.expires_at:
        try:
            ann.expires_at = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid expires_at format. Use ISO 8601, e.g. 2025-12-31T23:59:00Z",
            )
    else:
        ann.expires_at = None
    db.commit()
    _audit(db, admin, "update_announcement", "announcement", ann_id, data.title)
    return {"message": "Announcement updated."}


@router.delete("/announcements/{ann_id}")
async def admin_delete_announcement(
    ann_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    db.delete(ann)
    db.commit()
    _audit(db, admin, "delete_announcement", "announcement", ann_id, ann.title)
    return {"message": "Announcement deleted."}


# ---------------------------------------------------------------------------
# Site Settings (Feature Flags)
# ---------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "maintenance_mode": "false",
    "allow_signups": "true",
    "announcement_banner": "",
}

@router.get("/settings")
async def admin_get_settings(admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """Return all settings with defaults."""
    rows = {s.key: s.value for s in db.query(SiteSetting).all()}
    result = {}
    for k, default_val in DEFAULT_SETTINGS.items():
        result[k] = rows.get(k, default_val)
    return result


@router.patch("/settings")
async def admin_update_settings(
    data: SiteSettingUpdate,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    if data.key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Unknown setting key. Allowed keys: {sorted(DEFAULT_SETTINGS.keys())}")
    existing = db.query(SiteSetting).filter(SiteSetting.key == data.key).first()
    if existing:
        existing.value = data.value
    else:
        db.add(SiteSetting(key=data.key, value=data.value))
    db.commit()
    _audit(db, admin, "update_setting", "setting", target_label=data.key, details=f"value={data.value}")
    return {"message": "Setting updated.", "key": data.key, "value": data.value}


# ---------------------------------------------------------------------------
# System Health (enhanced)
# ---------------------------------------------------------------------------
@router.get("/system-health")
async def admin_system_health(admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    """Detailed system health for admin dashboard."""
    # DB check
    db_ok = True
    try:
        db.query(func.count(User.id)).scalar()
    except Exception:
        db_ok = False

    # LLM check — key present in env
    llm_ok = False
    try:
        import os
        from dotenv import load_dotenv
        load_dotenv()
        llm_ok = bool(os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY"))
    except Exception:
        try:
            from app.services.ai_specialist import ai_specialist
            llm_ok = ai_specialist.client is not None
        except Exception:
            llm_ok = False

    # Email check
    email_ok = False
    try:
        from app.email_service import is_configured
        email_ok = is_configured()
    except Exception:
        pass

    # Count DB tables and stats
    db_tables = 0
    total_users = 0
    total_assessments = 0
    try:
        from sqlalchemy import inspect as sa_inspect, text
        from app.database import engine
        from app.db_models import Assessment, CKDAssessment, HeartAssessment, BrainMriAnalysis, DietPlanRecord
        inspector = sa_inspect(engine)
        db_tables = len(inspector.get_table_names())
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_assessments = (
            (db.query(func.count(Assessment.id)).scalar() or 0) +
            (db.query(func.count(CKDAssessment.id)).scalar() or 0) +
            (db.query(func.count(HeartAssessment.id)).scalar() or 0) +
            (db.query(func.count(BrainMriAnalysis.id)).scalar() or 0) +
            (db.query(func.count(DietPlanRecord.id)).scalar() or 0)
        )
    except Exception as e:
        pass

    return {
        "status": "ok" if db_ok else "error",
        "db_tables": db_tables,
        "total_users": total_users,
        "total_assessments": total_assessments,
        "services": {
            "API": True,
            "Database": db_ok,
            "LLM / AI": llm_ok,
            "Email": email_ok,
        },
    }


# ---------------------------------------------------------------------------
# Admin Notes for users (feature f12)
# ---------------------------------------------------------------------------
@router.patch("/users/{user_id}/notes")
async def admin_update_user_notes(
    user_id: int, data: AdminUserNotesRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.admin_notes = data.admin_notes
    db.commit()
    _audit(db, admin, "update_notes", "user", user_id, user.email, "Notes updated")
    return {"message": "Notes updated.", "admin_notes": user.admin_notes}


# ---------------------------------------------------------------------------
# Send email to user (feature f13)
# ---------------------------------------------------------------------------
@router.post("/users/{user_id}/email")
async def admin_send_email_to_user(
    user_id: int, data: AdminSendEmailRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    try:
        from app.email_service import is_configured, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL
        if not is_configured():
            raise HTTPException(status_code=503, detail="Email service is not configured.")
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        msg = MIMEMultipart("alternative")
        msg["Subject"] = data.subject
        msg["From"] = FROM_EMAIL
        msg["To"] = user.email
        msg.attach(MIMEText(data.body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_HOST not in ("localhost", "127.0.0.1"):
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [user.email], msg.as_string())
        _audit(db, admin, "send_email", "user", user_id, user.email, f"Subject: {data.subject}")
        create_notification(db, user_id, data.subject, data.body or "", "info")
        return {"message": f"Email sent to {user.email}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to send email to {user.email}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ---------------------------------------------------------------------------
# Bulk email to users (feature f14)
# ---------------------------------------------------------------------------
@router.post("/users/bulk-email")
async def admin_bulk_email(
    data: AdminBulkEmailRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
) -> dict:
    try:
        from app.email_service import is_configured, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL
        if not is_configured():
            raise HTTPException(status_code=503, detail="Email service is not configured.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Email service unavailable.")

    # Build recipient list
    query = db.query(User).filter(User.is_active == True)
    if data.user_ids:
        query = query.filter(User.id.in_(data.user_ids))
    if data.role_filter:
        query = query.filter(User.role == data.role_filter)
    users = query.all()
    if not users:
        return {"message": "No matching users.", "sent": 0}

    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    sent_count = 0
    errors = []
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_HOST not in ("localhost", "127.0.0.1"):
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
            for u in users:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = data.subject
                    msg["From"] = FROM_EMAIL
                    msg["To"] = u.email
                    msg.attach(MIMEText(data.body, "plain"))
                    server.sendmail(FROM_EMAIL, [u.email], msg.as_string())
                    sent_count += 1
                    try:
                        create_notification(db, u.id, data.subject, data.body or "", "info")
                    except Exception:
                        pass
                except Exception as e:
                    errors.append(f"{u.email}: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP connection failed: {str(e)}")

    _audit(db, admin, "bulk_email", "user", details=f"sent={sent_count}, subject={data.subject}")
    result = {"message": f"Email sent to {sent_count} users.", "sent": sent_count}
    if errors:
        result["errors"] = errors
    return result


# ---------------------------------------------------------------------------
# Public: active announcements (no auth needed)
# ---------------------------------------------------------------------------
# This is registered in a separate router below
public_router = APIRouter(tags=["public"])

@public_router.get("/announcements/active")
async def get_active_announcements(db: Session = Depends(get_db)) -> List[dict]:
    now = datetime.utcnow()
    rows = (
        db.query(Announcement)
        .filter(
            Announcement.is_active == True,
            (Announcement.expires_at == None) | (Announcement.expires_at > now),
        )
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return [{"id": a.id, "title": a.title, "message": a.message} for a in rows]


# Public: view shared assessment (feature f16)
@public_router.get("/shared/assessment/{token}")
async def get_shared_assessment(token: str, db: Session = Depends(get_db)) -> dict:
    a = db.query(Assessment).filter(Assessment.share_token == token).first()
    if not a:
        raise HTTPException(status_code=404, detail="Shared assessment not found or link expired.")
    user = db.query(User).filter(User.id == a.user_id).first()
    return {
        "risk_level": a.risk_level,
        "probability": a.probability,
        "executive_summary": a.executive_summary,
        "payload": _safe_json(a.payload),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "user_name": user.full_name if user else "Unknown",
    }


@public_router.get("/shared/heart/{token}")
async def get_shared_heart_assessment(token: str, db: Session = Depends(get_db)) -> dict:
    a = db.query(HeartAssessment).filter(HeartAssessment.share_token == token).first()
    if not a:
        raise HTTPException(status_code=404, detail="Shared heart assessment not found or link expired.")
    user = db.query(User).filter(User.id == a.user_id).first()
    return {
        "risk_level": a.risk_level,
        "probability": a.probability,
        "executive_summary": a.executive_summary,
        "payload": _safe_json(a.payload),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "user_name": user.full_name if user else "Unknown",
    }


@public_router.get("/shared/ckd/{token}")
async def get_shared_ckd_assessment(token: str, db: Session = Depends(get_db)) -> dict:
    a = db.query(CKDAssessment).filter(CKDAssessment.share_token == token).first()
    if not a:
        raise HTTPException(status_code=404, detail="Shared CKD assessment not found or link expired.")
    user = db.query(User).filter(User.id == a.user_id).first()
    return {
        "prediction": a.prediction,
        "confidence": a.confidence,
        "executive_summary": a.executive_summary,
        "payload": _safe_json(a.payload),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "user_name": user.full_name if user else "Unknown",
    }
