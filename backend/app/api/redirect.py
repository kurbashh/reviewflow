"""
app/api/redirect.py

Этап 3.3 ТЗ: GET /api/redirect/{slug}

Вызывается промежуточной страницей фронтенда /go/{slug} (Next.js) в момент
клика клиента по ссылке из WhatsApp-сообщения. Именно здесь происходит
взвешенный случайный выбор площадки (app/services/redirect.py) — сама
ссылка в сообщении клиента статична и не меняется, поэтому паттерна
"все переходы идут по одной прямой ссылке" для модерации 2ГИС не возникает.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services.crud import get_location_by_slug
from app.services.redirect import RedirectResolutionError, resolve_redirect_target

router = APIRouter()


@router.get("/api/redirect/{slug}")
async def resolve_redirect(slug: str, session: AsyncSession = Depends(get_session)) -> dict:
    location = await get_location_by_slug(session, slug)
    if location is None:
        raise HTTPException(status_code=404, detail="redirect slug not found")

    # location.business подгружен через selectinload в get_location_by_slug —
    # см. комментарий там же про MissingGreenlet.
    business = location.business

    try:
        target = resolve_redirect_target(location=location, business=business)
    except RedirectResolutionError:
        raise HTTPException(
            status_code=422,
            detail="У бизнеса не настроена ни одна ссылка на площадку отзывов",
        )

    return {"redirect_url": target}
