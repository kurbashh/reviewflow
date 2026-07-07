"""
app/api/auth.py

Эндпоинты регистрации, входа и получения текущего пользователя.
Все входные данные валидируются через Pydantic-модели.
Пароли хэшируются через bcrypt, аутентификация — через JWT.
"""

from __future__ import annotations

import logging
import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import create_access_token, get_current_user
from app.db.models import User, Business
from app.db.session import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --------------------------------------------------------------------------
# Pydantic Schemas
# --------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BusinessBrief(BaseModel):
    id: uuid.UUID
    name: str
    plan: str
    status: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    businesses: list[BusinessBrief] = []

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_session)):
    """Регистрация нового пользователя. Возвращает JWT-токен сразу после создания."""

    # Проверяем, не занят ли email
    existing = await session.execute(
        select(User).where(User.email == payload.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=_hash_password(payload.password),
        full_name=payload.full_name,
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)

    logger.info("New user registered: %s", user.email)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)):
    """Вход по email + пароль. Возвращает JWT-токен."""

    result = await session.execute(
        select(User).where(User.email == payload.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )

    logger.info("User logged in: %s", user.email)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    """Возвращает данные текущего авторизованного пользователя."""
    return current_user
