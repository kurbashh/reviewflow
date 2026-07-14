"""
app/api/auth.py

Эндпоинты регистрации, входа и получения текущего пользователя.
Все входные данные валидируются через Pydantic-модели.
Пароли хэшируются через bcrypt, аутентификация — через JWT.
"""

from __future__ import annotations

import logging
import uuid
import hashlib
import httpx

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
# --------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(None, min_length=12, max_length=128)


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
# --------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


async def check_pwned_password(password: str) -> bool:
    """Проверяет пароль через API Have I Been Pwned."""
    sha1_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1_hash[:5], sha1_hash[5:]
    
    url = f"https://api.pwnedpasswords.com/range/{prefix}"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                hashes = (line.split(":") for line in response.text.splitlines())
                for h, count in hashes:
                    if h == suffix:
                        return True
    except httpx.RequestError as e:
        logger.warning(f"HIBP API error: {e}")
        # Если API недоступно, пропускаем проверку, чтобы не блокировать регистрацию
        pass
    
    return False


# --------------------------------------------------------------------------
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

    # Проверка пароля по базе утечек
    is_pwned = await check_pwned_password(payload.password)
    if is_pwned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этот пароль слишком предсказуем или найден в базах утечек, пожалуйста, выберите другой.",
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


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Обновляет профиль пользователя. Для смены email или пароля требуется current_password."""
    
    # Смена пароля
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Для смены пароля необходимо указать текущий пароль")
        if not _verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Неверный текущий пароль")
        
        is_pwned = await check_pwned_password(payload.new_password)
        if is_pwned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот пароль слишком предсказуем или найден в базах утечек, пожалуйста, выберите другой.",
            )
        
        current_user.password_hash = _hash_password(payload.new_password)

    # Смена email
    if payload.email and payload.email.lower() != current_user.email:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Для смены email необходимо указать текущий пароль")
        if not _verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Неверный текущий пароль")
            
        existing = await session.execute(
            select(User).where(User.email == payload.email.lower())
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Пользователь с таким email уже существует",
            )
        current_user.email = payload.email.lower()

    # Смена имени
    if payload.full_name:
        current_user.full_name = payload.full_name

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    return current_user
