"""
Face login (Option 2) routes: enroll face embedding, verify and issue JWT.
Frontend uses face-api.js or similar to compute 128-d embedding; backend stores and compares.
"""

import json
import logging
import math

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.db_models import User, FaceEnrollment
from app.auth import get_current_user, create_access_token
from app.routes.auth import _user_to_response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["face-auth"])

# Cosine similarity threshold (0..1). Tune for security vs convenience.
FACE_MATCH_THRESHOLD = 0.5
MAX_EMBEDDING_DIM = 256


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class EnrollBody(BaseModel):
    embedding: list[float]


class VerifyBody(BaseModel):
    embedding: list[float]


@router.post("/face-auth/enroll")
async def face_enroll(
    body: EnrollBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Store face embedding for the current user (one per user). Replaces any existing enrollment."""
    if len(body.embedding) > MAX_EMBEDDING_DIM or len(body.embedding) < 32:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Embedding must be 32–{MAX_EMBEDDING_DIM} dimensions",
        )
    embedding_json = json.dumps([round(x, 6) for x in body.embedding])
    existing = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == user.id).first()
    if existing:
        existing.embedding = embedding_json
        existing.enabled = True
    else:
        db.add(FaceEnrollment(user_id=user.id, embedding=embedding_json, enabled=True))
    db.commit()
    return {"ok": True, "message": "Face enrollment saved"}


@router.post("/face-auth/verify")
async def face_verify(body: VerifyBody, db: Session = Depends(get_db)):
    """Find user whose stored embedding best matches the request; return JWT if above threshold."""
    if len(body.embedding) > MAX_EMBEDDING_DIM or len(body.embedding) < 32:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Embedding must be 32–{MAX_EMBEDDING_DIM} dimensions",
        )
    enrollments = db.query(FaceEnrollment).filter(FaceEnrollment.enabled == True).all()
    best_score = -1.0
    best_user = None
    for en in enrollments:
        try:
            stored = json.loads(en.embedding)
        except Exception:
            continue
        if len(stored) != len(body.embedding):
            continue
        score = _cosine_similarity(body.embedding, stored)
        if score > best_score:
            best_score = score
            user = db.query(User).filter(User.id == en.user_id).first()
            if user and user.is_active:
                best_user = user
    if not best_user or best_score < FACE_MATCH_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No matching face found or confidence too low",
        )
    token = create_access_token(data={"sub": str(best_user.id), "role": best_user.role})
    return {"access_token": token, "user": _user_to_response(best_user)}


@router.get("/face-auth/status")
async def face_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return face enrollment and enabled state for settings UI."""
    en = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == user.id).first()
    if not en:
        return {"enrolled": False, "enabled": False}
    enabled = getattr(en, "enabled", True)  # backwards compat if column was added later
    return {"enrolled": True, "enabled": bool(enabled)}


class FaceSettingsBody(BaseModel):
    enabled: bool


@router.patch("/face-auth/settings")
async def face_toggle_enabled(
    body: FaceSettingsBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable or disable face login for the current user (must be enrolled)."""
    en = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == user.id).first()
    if not en:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Face not enrolled")
    # Use raw SQL so the update works even if the ORM column was added later
    try:
        db.execute(
            text("UPDATE face_enrollments SET enabled = :e WHERE user_id = :u"),
            {"e": 1 if body.enabled else 0, "u": user.id},
        )
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("Face toggle update failed (column may be missing): %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error. Please restart the backend to apply updates.",
        )
    return {"enabled": body.enabled}


@router.delete("/face-auth/enroll")
async def face_remove_enrollment(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove face enrollment so the user can no longer sign in with face until they re-enroll."""
    en = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == user.id).first()
    if not en:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Face not enrolled")
    db.delete(en)
    db.commit()
    return {"ok": True, "message": "Face enrollment removed"}
