"""User-scoped routes: my assessments, my diet plans, profile, avatar upload, export, share."""

import json
import logging
import re
import secrets
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User, Assessment, DietPlanRecord, Notification
from app.models import UserMeResponse, ProfileUpdateRequest, ChangePasswordRequest, SaveDietPlanRequest
from app.auth import get_current_user, hash_password

logger = logging.getLogger(__name__)
router = APIRouter(tags=["users"])

# Directory for avatar uploads (relative to backend app root)
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "uploads" / "avatars"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_SIZE_MB = 5
MAX_BYTES = MAX_SIZE_MB * 1024 * 1024


def _user_response(user: User) -> UserMeResponse:
    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        avatar_url=user.avatar_url,
        role=user.role or "user",
        preferred_language=user.preferred_language or "english",
        is_active=user.is_active,
        created_at=user.created_at,
        dietary_preference=user.dietary_preference or "",
        allergies=user.allergies or "",
        calorie_goal=user.calorie_goal,
        totp_enabled=bool(user.totp_enabled),
        onboarding_completed=bool(user.onboarding_completed),
    )


@router.get("/users/me", response_model=UserMeResponse)
async def get_me(user: User = Depends(get_current_user)):
    return _user_response(user)


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
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url.strip() if data.avatar_url else None
    if data.dietary_preference is not None:
        user.dietary_preference = data.dietary_preference.strip()
    if data.allergies is not None:
        user.allergies = data.allergies.strip()
    if data.calorie_goal is not None:
        user.calorie_goal = data.calorie_goal
    if data.onboarding_completed is not None:
        user.onboarding_completed = data.onboarding_completed
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile picture from the user's computer. Returns the avatar URL and updates the user."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image (jpg, png, gif, webp).")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Allowed formats: jpg, jpeg, png, gif, webp.")
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image must be under {MAX_SIZE_MB} MB.")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{user.id}_{int(time.time() * 1000)}{suffix}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        f.write(contents)
    # Store relative path so frontend can prepend its API_BASE_URL and always load from same origin
    avatar_path = f"/uploads/avatars/{filename}"
    user.avatar_url = avatar_path
    db.commit()
    db.refresh(user)
    logger.info(f"User {user.id} uploaded avatar: {filename}")
    return {"avatar_url": avatar_path}


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


@router.post("/users/me/diet-plans")
async def save_diet_plan(
    body: SaveDietPlanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a diet plan to the current user's account (e.g. from mobile)."""
    overview = (body.overview or (body.payload.get("overview") if body.payload else ""))[:4096]
    goal = (body.goal or (body.payload.get("goals") if isinstance(body.payload, dict) else "")) or ""
    if isinstance(goal, str):
        goal = goal[:128]
    rec = DietPlanRecord(
        user_id=user.id,
        goal=goal,
        overview=overview,
        payload=json.dumps(body.payload) if body.payload else None,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "message": "saved"}


# ---- Export my data (feature f11) ----
@router.get("/users/me/export")
async def export_my_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all user data as JSON for download."""
    assessments = (
        db.query(Assessment).filter(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc()).all()
    )
    diet_plans = (
        db.query(DietPlanRecord).filter(DietPlanRecord.user_id == user.id)
        .order_by(DietPlanRecord.created_at.desc()).all()
    )
    return {
        "profile": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name or "",
            "role": user.role or "user",
            "preferred_language": user.preferred_language or "english",
            "dietary_preference": user.dietary_preference or "",
            "allergies": user.allergies or "",
            "calorie_goal": user.calorie_goal,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "assessments": [
            {
                "id": a.id,
                "assessment_id": a.assessment_id,
                "risk_level": a.risk_level,
                "probability": a.probability,
                "executive_summary": a.executive_summary,
                "payload": json.loads(a.payload) if a.payload else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in assessments
        ],
        "diet_plans": [
            {
                "id": d.id,
                "goal": d.goal,
                "overview": d.overview,
                "payload": json.loads(d.payload) if d.payload else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in diet_plans
        ],
        "exported_at": datetime.utcnow().isoformat(),
    }


# ---- Share assessment with doctor (feature f16) ----
@router.post("/users/me/assessments/{assessment_id}/share")
async def share_assessment(
    assessment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a public share token for an assessment."""
    a = db.query(Assessment).filter(
        Assessment.id == assessment_id, Assessment.user_id == user.id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not a.share_token:
        a.share_token = secrets.token_urlsafe(32)
        db.commit()
        db.refresh(a)
    return {"share_token": a.share_token, "assessment_id": a.id}


@router.delete("/users/me/assessments/{assessment_id}/share")
async def revoke_share(
    assessment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a shared assessment link."""
    a = db.query(Assessment).filter(
        Assessment.id == assessment_id, Assessment.user_id == user.id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    a.share_token = None
    db.commit()
    return {"message": "Share link revoked"}


@router.delete("/users/me/assessments/{assessment_id}")
async def delete_assessment(
    assessment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete one of the current user's assessments."""
    a = db.query(Assessment).filter(
        Assessment.id == assessment_id, Assessment.user_id == user.id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(a)
    db.commit()
    return {"message": "Assessment deleted"}


@router.delete("/users/me/diet-plans/{diet_plan_id}")
async def delete_diet_plan(
    diet_plan_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete one of the current user's diet plans."""
    d = db.query(DietPlanRecord).filter(
        DietPlanRecord.id == diet_plan_id, DietPlanRecord.user_id == user.id
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diet plan not found")
    db.delete(d)
    db.commit()
    return {"message": "Diet plan deleted"}


# ---- 2FA TOTP setup (feature f15) ----
@router.post("/users/me/2fa/setup")
async def setup_2fa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a TOTP secret and return URI for QR code scanning."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=501, detail="2FA not available (pyotp not installed)")
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="Bonus Life AI")
    return {"secret": secret, "uri": uri}


@router.post("/users/me/2fa/verify")
async def verify_2fa(
    code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify TOTP code and enable 2FA."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=501, detail="2FA not available (pyotp not installed)")
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="No 2FA setup found. Call /2fa/setup first.")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code. Try again.")
    user.totp_enabled = True
    db.commit()
    return {"message": "2FA enabled successfully"}


@router.post("/users/me/2fa/disable")
async def disable_2fa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable 2FA for the current user."""
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"message": "2FA disabled"}


# ---- Notifications (feature f17) ----
@router.get("/users/me/notifications")
async def get_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
) -> List[dict]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]


@router.post("/users/me/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.post("/users/me/notifications/read-all")
async def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}
