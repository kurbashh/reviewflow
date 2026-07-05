"""
app/api/webhooks.py

Этап 2 ТЗ: happy path без ИИ-генерации.

- POST /webhook/intake — приём события "визит завершён" (пока вручную/через
  тестовую форму; интеграция с реальными CRM — Этап 4) и постановка задачи
  отправки запроса на оценку в очередь Celery.
- POST /webhook/reply  — приём ответа клиента (Green API webhook) и разбор
  цифры-оценки. Ветвление на ИИ-генерацию/перехват негатива — Этап 3,
  здесь только фиксируется рейтинг и статус "rated" (см. TODO ниже).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_business_secret
from app.core.timing import random_delay
from app.db.models import ReviewRequestStatus
from app.db.session import get_session
from app.services.crud import (
    create_review_request,
    find_latest_pending_request,
    get_business,
    is_opted_out,
    update_review_request,
)
from app.tasks.send_review_request import send_review_request_task

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/webhook/intake")
async def webhook_intake(payload: dict, session: AsyncSession = Depends(get_session)):
    business_id = payload.get("business_id")
    client_phone = payload.get("client_phone")

    if not business_id or not client_phone:
        raise HTTPException(status_code=422, detail="business_id и client_phone обязательны")

    business = await get_business(session, business_id)
    if not business or not verify_business_secret(business, payload.get("secret")):
        # Намеренно одна и та же ошибка для "бизнес не найден" и "секрет неверный" —
        # чтобы не давать возможность перебором узнать, какие business_id существуют.
        raise HTTPException(status_code=401, detail="unauthorized")

    if await is_opted_out(session, client_phone, business_id):
        return {"status": "skipped"}

    request = await create_review_request(
        session,
        business_id=business_id,
        client_phone=client_phone,
        client_name=payload.get("client_name"),
        service_name=payload.get("service_name"),
        master_name=payload.get("master_name"),
        location_id=payload.get("location_id"),
    )
    await session.flush()

    # request.id уже присвоен (flush в create_review_request), но commit ещё не
    # произошёл — он случится в get_session после успешного возврата из роута.
    # Задачу в Celery можно ставить уже сейчас: request существует в транзакции,
    # а celery worker прочитает её из БД не раньше, чем через 5 минут (random_delay),
    # commit к этому моменту гарантированно случится.
    send_review_request_task.apply_async(
        args=[str(request.id)], countdown=random_delay()
    )

    return {"status": "queued", "id": str(request.id)}


@router.post("/webhook/reply")
async def webhook_reply(payload: dict, session: AsyncSession = Depends(get_session)):
    try:
        sender_phone = payload["senderData"]["sender"]
        text = payload["messageData"]["textMessageData"]["textMessage"].strip()
    except (KeyError, AttributeError):
        # Не текстовое сообщение (голосовое/картинка) или payload другого типа
        # события Green API (не incomingMessageReceived) — просто игнорируем.
        return {"status": "ignored"}

    request = await find_latest_pending_request(session, sender_phone)
    if not request:
        return {"status": "no_match"}

    if not text.isdigit() or not (1 <= int(text) <= 5):
        return {"status": "ignored"}

    rating = int(text)
    await update_review_request(
        session, request.id, status=ReviewRequestStatus.RATED, rating=rating
    )

    # TODO (Этап 3): в зависимости от rating запустить
    #   - generate_review_task.delay(...) для rating >= 4
    #   - capture_negative_task.delay(...) для rating <= 3
    # Пока не подключаем — обе таски ещё пустые заглушки (app/tasks/*).
    logger.info("webhook_reply: request %s получил оценку %s", request.id, rating)

    return {"status": "ok"}
