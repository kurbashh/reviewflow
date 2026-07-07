from __future__ import annotations

import uuid
import secrets
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services import crud
from app.db.models import BusinessPlan, BusinessStatus, CrmType, User, Business
from app.core.jwt import get_current_user

router = APIRouter()

# --------------------------------------------------------------------------
# Pydantic Schemas
# --------------------------------------------------------------------------

class LocationResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    redirect_slug: str
    gis_2gis_url: str | None = None
    yandex_maps_url: str | None = None

    class Config:
        from_attributes = True

class BusinessSettingsResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None = None
    phone: str
    plan: BusinessPlan
    status: BusinessStatus
    gis_2gis_url: str | None = None
    yandex_maps_url: str | None = None
    telegram_chat_id: str | None = None
    crm_type: CrmType | None = None
    crm_webhook_secret: str
    locations: list[LocationResponse]

    class Config:
        from_attributes = True

class BusinessSettingsUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str | None = Field(None, max_length=120)
    phone: str = Field(..., max_length=32)
    crm_type: CrmType | None = None
    gis_2gis_url: str | None = Field(None, max_length=512)
    yandex_maps_url: str | None = Field(None, max_length=512)
    telegram_chat_id: str | None = Field(None, max_length=64)

class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    redirect_slug: str = Field(..., min_length=1, max_length=64)
    gis_2gis_url: str | None = Field(None, max_length=512)
    yandex_maps_url: str | None = Field(None, max_length=512)

class OnboardingRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., max_length=32)

class OnboardingResponse(BaseModel):
    business_id: uuid.UUID
    message: str

class LocationUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    gis_2gis_url: str | None = Field(None, max_length=512)
    yandex_maps_url: str | None = Field(None, max_length=512)

class ReviewResponse(BaseModel):
    id: uuid.UUID
    client_name: str | None = None
    client_phone: str
    service_name: str | None = None
    master_name: str | None = None
    status: str
    rating: int | None = None
    generated_review: str | None = None
    owner_feedback: str | None = None
    created_at: str
    completed_at: str | None = None

class ReviewsListResponse(BaseModel):
    reviews: list[ReviewResponse]
    total_count: int

class BillingResponse(BaseModel):
    plan: BusinessPlan
    status: BusinessStatus
    created_at: str
    trial_ends_at: str
    amount_due: int
    payment_link: str

# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------

@router.post("/onboarding", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
async def complete_onboarding(
    payload: OnboardingRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Создание первого бизнеса пользователя (онбординг)."""
    business = Business(
        owner_id=current_user.id,
        name=payload.name,
        phone=payload.phone,
        crm_webhook_secret=secrets.token_urlsafe(32),
    )
    session.add(business)
    await session.commit()
    await session.refresh(business)
    return OnboardingResponse(business_id=business.id, message="Бизнес успешно создан")

@router.get("/{business_id}/stats")
async def get_dashboard_stats(
    business_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    business = await crud.get_business(session, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    return await crud.get_business_stats(session, business_uuid)


@router.get("/{business_id}/reviews", response_model=ReviewsListResponse)
async def get_dashboard_reviews(
    business_id: str,
    limit: int = 50,
    offset: int = 0,
    rating_lte: int | None = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    business = await crud.get_business(session, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    reviews, total_count = await crud.get_business_reviews(
        session, business_uuid, limit=limit, offset=offset, rating_lte=rating_lte
    )

    formatted_reviews = []
    for r in reviews:
        formatted_reviews.append(
            ReviewResponse(
                id=r.id,
                client_name=r.client_name,
                client_phone=r.client_phone,
                service_name=r.service_name,
                master_name=r.master_name,
                status=r.status.value,
                rating=r.rating,
                generated_review=r.generated_review,
                owner_feedback=r.owner_feedback,
                created_at=r.created_at.isoformat(),
                completed_at=r.completed_at.isoformat() if r.completed_at else None,
            )
        )

    return ReviewsListResponse(reviews=formatted_reviews, total_count=total_count)


@router.get("/{business_id}/settings", response_model=BusinessSettingsResponse)
async def get_dashboard_settings(
    business_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    business = await crud.get_business(session, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    locations = await crud.get_business_locations(session, business_uuid)
    formatted_locations = [LocationResponse.model_validate(loc) for loc in locations]

    return BusinessSettingsResponse(
        id=business.id,
        name=business.name,
        category=business.category,
        phone=business.phone,
        plan=business.plan,
        status=business.status,
        gis_2gis_url=business.gis_2gis_url,
        yandex_maps_url=business.yandex_maps_url,
        telegram_chat_id=business.telegram_chat_id,
        crm_type=business.crm_type,
        crm_webhook_secret=business.crm_webhook_secret,
        locations=formatted_locations,
    )


@router.put("/{business_id}/settings", response_model=dict[str, str])
async def update_dashboard_settings(
    business_id: str,
    payload: BusinessSettingsUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    updated = await crud.update_business_settings(session, business_uuid, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    return {"status": "success"}


@router.get("/{business_id}/locations", response_model=list[LocationResponse])
async def get_dashboard_locations(
    business_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    business = await crud.get_business(session, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    locations = await crud.get_business_locations(session, business_uuid)
    return [LocationResponse.model_validate(loc) for loc in locations]


@router.post("/{business_id}/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard_location(
    business_id: str,
    payload: LocationCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    business = await crud.get_business(session, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    # Проверка уникальности слага редиректа
    existing_loc = await crud.get_location_by_slug(session, payload.redirect_slug)
    if existing_loc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот слаг редиректа уже занят")

    location = await crud.create_location(
        session,
        business_uuid,
        name=payload.name,
        redirect_slug=payload.redirect_slug,
        gis_2gis_url=payload.gis_2gis_url,
        yandex_maps_url=payload.yandex_maps_url,
    )
    return LocationResponse.model_validate(location)


@router.put("/{business_id}/locations/{location_id}", response_model=LocationResponse)
async def update_dashboard_location(
    business_id: str,
    location_id: str,
    payload: LocationUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        loc_uuid = uuid.UUID(location_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID локации")

    updated = await crud.update_location(
        session,
        loc_uuid,
        name=payload.name,
        gis_2gis_url=payload.gis_2gis_url,
        yandex_maps_url=payload.yandex_maps_url,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Локация не найдена")

    return LocationResponse.model_validate(updated)


@router.delete("/{business_id}/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard_location(
    business_id: str,
    location_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        loc_uuid = uuid.UUID(location_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID локации")

    deleted = await crud.delete_location(session, loc_uuid)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Локация не найдена")

    return None


@router.get("/{business_id}/billing", response_model=BillingResponse)
async def get_dashboard_billing(
    business_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный формат UUID бизнеса")

    business = await crud.get_business(session, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бизнес не найден")

    from datetime import timedelta
    trial_ends = business.created_at + timedelta(days=14)

    # Mock payment amount and link
    amount_due = 15000  # 15,000 KZT
    payment_link = f"https://pay.kaspi.kz/pay/reviewflow?merchant_id=rf_{business.id}&amount={amount_due}"

    return BillingResponse(
        plan=business.plan,
        status=business.status,
        created_at=business.created_at.isoformat(),
        trial_ends_at=trial_ends.isoformat(),
        amount_due=amount_due,
        payment_link=payment_link,
    )
