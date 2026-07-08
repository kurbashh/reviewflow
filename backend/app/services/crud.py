"""
app/services/crud.py

CRUD-хелперы для работы с ReviewRequest/Business.

Два независимых набора функций на одних и тех же моделях:
- Async-версии (suffix отсутствует) — используются в app/api/* через
  AsyncSession из app/db/session.get_session.
- Sync-версии (suffix _sync) — используются в app/tasks/* через
  Session из app/db/session.get_sync_session (см. docstring там же,
  почему Celery работает синхронно, а не через asyncio).

Дублирование небольшое (пара функций), но так проще, чем гонять asyncio
внутри Celery prefork-воркера — сознательный компромисс, принятый в ТЗ.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from app.db.models import Business, Location, OptedOutNumber, ReviewRequest, ReviewRequestStatus

# --------------------------------------------------------------------------
# Async — для FastAPI (app/api/webhooks.py)
# --------------------------------------------------------------------------


async def get_business(session: AsyncSession, business_id: str) -> Business | None:
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        return None
    return await session.get(Business, business_uuid)


async def get_owned_business(session: AsyncSession, business_id: str, owner_id: uuid.UUID) -> Business | None:
    business = await get_business(session, business_id)
    if business and business.owner_id == owner_id:
        return business
    return None

async def is_opted_out(session: AsyncSession, phone: str, business_id: str) -> bool:
    stmt = select(OptedOutNumber).where(
        OptedOutNumber.phone == phone,
        OptedOutNumber.business_id == business_id,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def opt_out_client(session: AsyncSession, phone: str, business_id: str) -> None:
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        return
    if await is_opted_out(session, phone, business_id):
        return
    opt_out = OptedOutNumber(phone=phone, business_id=business_uuid)
    session.add(opt_out)
    await session.commit()


async def has_recent_request(session: AsyncSession, phone: str, business_id: str, days: int = 7) -> bool:
    try:
        business_uuid = uuid.UUID(business_id)
    except ValueError:
        return False
    
    threshold = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = select(ReviewRequest).where(
        ReviewRequest.client_phone == phone,
        ReviewRequest.business_id == business_uuid,
        ReviewRequest.created_at >= threshold
    ).limit(1)
    
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def create_review_request(
    session: AsyncSession,
    *,
    business_id: str,
    client_phone: str,
    client_name: str | None = None,
    service_name: str | None = None,
    master_name: str | None = None,
    location_id: str | None = None,
) -> ReviewRequest:
    request = ReviewRequest(
        business_id=business_id,
        location_id=location_id,
        client_phone=client_phone,
        client_name=client_name,
        service_name=service_name,
        master_name=master_name,
        status=ReviewRequestStatus.PENDING,
    )
    session.add(request)
    await session.commit()  # чтобы request.id был доступен до commit (его делает get_session)
    return request


async def find_latest_pending_request(
    session: AsyncSession, client_phone: str
) -> ReviewRequest | None:
    """
    Находит последний запрос со статусом SENT для данного номера —
    именно на него ждём цифру-оценку от клиента в /webhook/reply.

    Поиск идёт по client_phone глобально (без business_id), т.к. входящий
    вебхук Green API приходит с конкретного WhatsApp-номера-инстанса —
    сопоставление с бизнесом уже произошло на этапе отправки.
    """
    stmt = (
        select(ReviewRequest)
        .where(
            ReviewRequest.client_phone == client_phone,
            ReviewRequest.status == ReviewRequestStatus.SENT,
        )
        .order_by(ReviewRequest.sent_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def find_latest_awaiting_feedback_request(
    session: AsyncSession, client_phone: str
) -> ReviewRequest | None:
    """
    Этап 3.2 ТЗ: находит запрос, для которого владельцу уже отправлен вопрос
    "что не понравилось" (status=AWAITING_FEEDBACK) и мы ждём от клиента
    текстового ответа с деталями негатива.

    Вызывается в /webhook/reply ПОСЛЕ того, как find_latest_pending_request
    не нашёл активный запрос на оценку — т.е. это резервная ветка разбора
    входящего сообщения (см. app/api/webhooks.py).
    """
    stmt = (
        select(ReviewRequest)
        .where(
            ReviewRequest.client_phone == client_phone,
            ReviewRequest.status == ReviewRequestStatus.AWAITING_FEEDBACK,
        )
        .order_by(ReviewRequest.responded_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def find_latest_request_any_status(
    session: AsyncSession, client_phone: str
) -> ReviewRequest | None:
    stmt = (
        select(ReviewRequest)
        .where(ReviewRequest.client_phone == client_phone)
        .order_by(ReviewRequest.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_location_by_slug(session: AsyncSession, slug: str) -> Location | None:
    """
    selectinload(Location.business) обязателен: app/api/redirect.py читает
    location.business синхронным атрибутом (не через await) сразу после
    вызова этой функции. Без явного eager load AsyncSession не может
    неявно лениво подгрузить relationship вне await-контекста и падает
    с MissingGreenlet при первом же обращении к .business.
    """
    stmt = (
        select(Location)
        .where(Location.redirect_slug == slug)
        .options(selectinload(Location.business))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def update_review_request(
    session: AsyncSession,
    request_id: uuid.UUID,
    *,
    status: ReviewRequestStatus | None = None,
    rating: int | None = None,
) -> None:
    request = await session.get(ReviewRequest, request_id)
    if request is None:
        return
    if status is not None:
        request.status = status
    if rating is not None:
        request.rating = rating
        request.responded_at = datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# Sync — для Celery-тасок (app/tasks/*)
# --------------------------------------------------------------------------


def get_review_request_sync(session: Session, request_id: str) -> ReviewRequest:
    request = session.get(ReviewRequest, uuid.UUID(request_id))
    if request is None:
        raise ValueError(f"ReviewRequest {request_id} не найден")
    return request


def update_status_sync(
    session: Session,
    request_id: str,
    *,
    status: ReviewRequestStatus,
    **extra_fields,
) -> None:
    request = get_review_request_sync(session, request_id)
    request.status = status
    for field, value in extra_fields.items():
        setattr(request, field, value)
    if status == ReviewRequestStatus.SENT:
        request.sent_at = datetime.now(timezone.utc)
    elif status == ReviewRequestStatus.COMPLETED:
        # Единая точка простановки completed_at — и для "лояльного" сценария
        # (generate_review_task, Этап 3.1), и для перехваченного негатива
        # (capture_negative.deliver_negative_feedback_task, Этап 3.2).
        request.completed_at = datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# Dashboard / Onboarding / CRUD Stats (Этап 5 ТЗ)
# --------------------------------------------------------------------------

async def get_business_stats(session: AsyncSession, business_id: uuid.UUID) -> dict:
    # 1. Total Sent (sent_at is not null)
    sent_stmt = select(func.count(ReviewRequest.id)).where(
        ReviewRequest.business_id == business_id,
        ReviewRequest.sent_at.is_not(None),
    )
    sent_res = await session.execute(sent_stmt)
    sent_count = sent_res.scalar_one() or 0

    # 2. Total Rated (rating is not null)
    rated_stmt = select(func.count(ReviewRequest.id)).where(
        ReviewRequest.business_id == business_id,
        ReviewRequest.rating.is_not(None),
    )
    rated_res = await session.execute(rated_stmt)
    rated_count = rated_res.scalar_one() or 0

    # 3. Average Rating
    avg_stmt = select(func.avg(ReviewRequest.rating)).where(
        ReviewRequest.business_id == business_id,
        ReviewRequest.rating.is_not(None),
    )
    avg_res = await session.execute(avg_stmt)
    avg_val = avg_res.scalar_one()
    avg_rating = round(float(avg_val), 1) if avg_val is not None else 0.0

    # 4. Pending Replies (status is SENT or AWAITING_FEEDBACK)
    pending_stmt = select(func.count(ReviewRequest.id)).where(
        ReviewRequest.business_id == business_id,
        ReviewRequest.status.in_([ReviewRequestStatus.SENT, ReviewRequestStatus.AWAITING_FEEDBACK]),
    )
    pending_res = await session.execute(pending_stmt)
    pending_count = pending_res.scalar_one() or 0

    # 5. Reviews Completed (status is COMPLETED)
    completed_stmt = select(func.count(ReviewRequest.id)).where(
        ReviewRequest.business_id == business_id,
        ReviewRequest.status == ReviewRequestStatus.COMPLETED,
    )
    completed_res = await session.execute(completed_stmt)
    completed_count = completed_res.scalar_one() or 0

    # 6. Negative Captured (rating <= 3)
    negative_stmt = select(func.count(ReviewRequest.id)).where(
        ReviewRequest.business_id == business_id,
        ReviewRequest.rating <= 3,
    )
    negative_res = await session.execute(negative_stmt)
    negative_count = negative_res.scalar_one() or 0

    # 7. Daily Stats (last 7 days)
    daily_stmt = (
        select(
            cast(ReviewRequest.created_at, Date).label("day"),
            func.count(ReviewRequest.id).label("sent"),
            func.count(ReviewRequest.rating).label("rated"),
            func.avg(ReviewRequest.rating).label("avg_rating"),
        )
        .where(ReviewRequest.business_id == business_id)
        .group_by(cast(ReviewRequest.created_at, Date))
        .order_by(cast(ReviewRequest.created_at, Date).desc())
        .limit(7)
    )
    daily_res = await session.execute(daily_stmt)
    daily_rows = daily_res.all()

    # Format daily stats in chronological order
    daily_stats = []
    for row in reversed(daily_rows):
        daily_stats.append({
            "date": str(row.day),
            "sent": row.sent,
            "rated": row.rated,
            "avg_rating": round(float(row.avg_rating), 1) if row.avg_rating is not None else 0.0
        })

    # Fallback default values if no activity is recorded
    if not daily_stats:
        from datetime import date, timedelta
        today = date.today()
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            daily_stats.append({
                "date": str(d),
                "sent": 0,
                "rated": 0,
                "avg_rating": 0.0
            })

    # 8. Location Stats
    loc_stmt = (
        select(
            Location.name.label("location_name"),
            func.count(ReviewRequest.id).label("sent"),
            func.count(ReviewRequest.rating).label("rated"),
            func.avg(ReviewRequest.rating).label("avg_rating"),
        )
        .join(ReviewRequest, ReviewRequest.location_id == Location.id, isouter=True)
        .where(Location.business_id == business_id)
        .group_by(Location.name)
    )
    loc_res = await session.execute(loc_stmt)
    loc_rows = loc_res.all()

    location_stats = []
    for row in loc_rows:
        location_stats.append({
            "name": row.location_name,
            "sent": row.sent,
            "rated": row.rated,
            "avg_rating": round(float(row.avg_rating), 1) if row.avg_rating is not None else 0.0
        })

    response_rate = round((rated_count / sent_count) * 100, 1) if sent_count > 0 else 0.0

    return {
        "sent": sent_count,
        "rated": rated_count,
        "avg_rating": avg_rating,
        "pending_replies": pending_count,
        "reviews_completed": completed_count,
        "negative_captured": negative_count,
        "response_rate": response_rate,
        "daily_stats": daily_stats,
        "location_stats": location_stats
    }


async def get_business_reviews(
    session: AsyncSession,
    business_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    rating_lte: int | None = None,
) -> tuple[list[ReviewRequest], int]:
    stmt = (
        select(ReviewRequest)
        .where(ReviewRequest.business_id == business_id)
        .order_by(ReviewRequest.created_at.desc())
    )
    if rating_lte is not None:
        stmt = stmt.where(ReviewRequest.rating <= rating_lte)

    # Count query
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await session.execute(count_stmt)
    total_count = count_res.scalar_one() or 0

    # Limit and Offset query
    stmt = stmt.limit(limit).offset(offset)
    res = await session.execute(stmt)
    reviews = res.scalars().all()
    return list(reviews), total_count


async def update_business_settings(
    session: AsyncSession,
    business_id: uuid.UUID,
    settings_data: dict,
) -> Business | None:
    business = await session.get(Business, business_id)
    if not business:
        return None

    updatable_fields = [
        "name", "category", "phone", "crm_type",
        "gis_2gis_url", "yandex_maps_url", "telegram_chat_id"
    ]
    for field in updatable_fields:
        if field in settings_data:
            setattr(business, field, settings_data[field])

    await session.commit()
    return business


async def get_business_locations(
    session: AsyncSession,
    business_id: uuid.UUID,
) -> list[Location]:
    stmt = select(Location).where(Location.business_id == business_id).order_by(Location.name.asc())
    res = await session.execute(stmt)
    return list(res.scalars().all())


async def create_location(
    session: AsyncSession,
    business_id: uuid.UUID,
    name: str,
    redirect_slug: str,
    gis_2gis_url: str | None = None,
    yandex_maps_url: str | None = None,
) -> Location:
    location = Location(
        business_id=business_id,
        name=name,
        redirect_slug=redirect_slug,
        gis_2gis_url=gis_2gis_url,
        yandex_maps_url=yandex_maps_url,
    )
    session.add(location)
    await session.commit()
    return location


async def update_location(
    session: AsyncSession,
    business_id: uuid.UUID,
    location_id: uuid.UUID,
    name: str,
    gis_2gis_url: str | None = None,
    yandex_maps_url: str | None = None,
) -> Location | None:
    location = await session.get(Location, location_id)
    if not location or location.business_id != business_id:
        return None
    location.name = name
    location.gis_2gis_url = gis_2gis_url
    location.yandex_maps_url = yandex_maps_url
    await session.commit()
    return location


async def delete_location(
    session: AsyncSession,
    business_id: uuid.UUID,
    location_id: uuid.UUID,
) -> bool:
    location = await session.get(Location, location_id)
    if not location or location.business_id != business_id:
        return False
    await session.delete(location)
    await session.commit()
    return True
