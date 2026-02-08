"""Auth routes: register, login, me."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.models import RegisterRequest, LoginRequest, TokenResponse, UserMeResponse
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


def _user_to_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name or "",
        "role": user.role or "user",
        "preferred_language": user.preferred_language or "english",
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/auth/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
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
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.get("/auth/me", response_model=UserMeResponse)
async def me(user: User = Depends(get_current_user)):
    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role or "user",
        preferred_language=user.preferred_language or "english",
        is_active=user.is_active,
        created_at=user.created_at,
    )
