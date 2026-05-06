"""Auth routes: register, login, me, forgot-password, reset-password."""

import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User, SiteSetting
from app.models import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserMeResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.email_service import send_password_reset_email
from app.rate_limit import check_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


def _is_maintenance(db: Session) -> bool:
    """Check if maintenance_mode is enabled in site settings."""
    row = db.query(SiteSetting).filter(SiteSetting.key == "maintenance_mode").first()
    return bool(row and row.value.lower() in ("true", "1", "yes"))


def _signups_allowed(db: Session) -> bool:
    """Check if allow_signups is enabled (default True if not set)."""
    row = db.query(SiteSetting).filter(SiteSetting.key == "allow_signups").first()
    if not row:
        return True
    return row.value.lower() in ("true", "1", "yes")


def _user_to_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name or "",
        "avatar_url": user.avatar_url,
        "role": user.role or "user",
        "preferred_language": user.preferred_language or "english",
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "dietary_preference": getattr(user, "dietary_preference", None) or "",
        "allergies": getattr(user, "allergies", None) or "",
        "calorie_goal": getattr(user, "calorie_goal", None),
        "totp_enabled": getattr(user, "totp_enabled", False) or False,
        "onboarding_completed": getattr(user, "onboarding_completed", False) or False,
    }


@router.get("/auth/maintenance-status")
async def maintenance_status(db: Session = Depends(get_db)):
    """Public endpoint: returns maintenance mode and whether signups are allowed."""
    return {
        "maintenance": _is_maintenance(db),
        "allow_signups": _signups_allowed(db),
    }


@router.post("/auth/register", response_model=TokenResponse)
async def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    check_rate_limit(f"register:{request.client.host if request.client else 'unknown'}", max_calls=10, window_seconds=600)
    if _is_maintenance(db):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Registration is disabled during maintenance.")
    if not _signups_allowed(db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Registration is currently disabled.")
    if db.query(User).filter(User.email == data.email.lower().strip()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        full_name=(data.full_name or "").strip(),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.post("/auth/login", response_model=TokenResponse)
async def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    check_rate_limit(f"login:{request.client.host if request.client else 'unknown'}", max_calls=10, window_seconds=60)
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    password = (data.password or "").strip()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    # Block non-admin logins during maintenance
    if _is_maintenance(db) and (user.role or "user") != "admin":
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="The platform is currently under maintenance. Please try again later.")
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.get("/auth/me", response_model=UserMeResponse)
async def me(user: User = Depends(get_current_user)):
    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        avatar_url=user.avatar_url,
        role=user.role or "user",
        preferred_language=user.preferred_language or "english",
        is_active=user.is_active,
        created_at=user.created_at,
        dietary_preference=getattr(user, "dietary_preference", None) or "",
        allergies=getattr(user, "allergies", None) or "",
        calorie_goal=getattr(user, "calorie_goal", None),
        totp_enabled=bool(getattr(user, "totp_enabled", False)),
        onboarding_completed=bool(getattr(user, "onboarding_completed", False)),
        subscription_tier=getattr(user, "subscription_tier", None) or "free",
        subscription_status=getattr(user, "subscription_status", None) or "",
        current_period_end=getattr(user, "current_period_end", None),
    )


@router.post("/auth/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a time-limited reset token and email the link. Does NOT change the current password."""
    check_rate_limit(f"forgot:{request.client.host if request.client else 'unknown'}", max_calls=3, window_seconds=300)
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        if not send_password_reset_email(user.email, token):
            logger.info("Dev reset link for %s: /reset-password?token=%s", user.email, token)
        logger.info("Password reset email sent to %s", user.email)
    return {"message": "If an account exists with this email, you will receive a password reset link."}


@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Set new password using the token from the reset link."""
    if not data.token or not data.new_password or len(data.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    user = (
        db.query(User)
        .filter(
            User.password_reset_token == data.token,
            User.password_reset_expires != None,
            User.password_reset_expires > datetime.utcnow(),
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    user.hashed_password = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    logger.info(f"Password reset completed for {user.email}")
    return {"message": "Password updated. You can now sign in."}
