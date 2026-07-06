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
from datetime import datetime, timezone

from sqlalchemy import select
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


async def is_opted_out(session: AsyncSession, phone: str, business_id: str) -> bool:
    stmt = select(OptedOutNumber).where(
        OptedOutNumber.phone == phone,
        OptedOutNumber.business_id == business_id,
    )
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
    await session.flush()  # чтобы request.id был доступен до commit (его делает get_session)
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
    свободный текст — в отличие от find_latest_pending_request, здесь ждём
    не цифру-оценку, а произвольное сообщение.

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
