"""
app/api/webhooks.py

- POST /webhook/intake — приём события "визит завершён" (пока вручную/через
  тестовую форму; интеграция с реальными CRM — Этап 4) и постановка задачи
  отправки запроса на оценку в очередь Celery.
- POST /webhook/reply  — приём ответа клиента (Green API webhook). Разбирает
  два принципиально разных случая по текущему статусу активного запроса
  клиента (Этап 3 ТЗ):
    1. status=SENT             — ждём цифру-оценку 1-5. При 4-5 запускаем
       generate_review_task (ИИ-текст + ссылка), при 1-3 — capture_negative_task
       (уточняющий вопрос, см. app/tasks/capture_negative.py).
    2. status=AWAITING_FEEDBACK — ждём свободный текст с деталями негатива
       после capture_negative_task; запускаем deliver_negative_feedback_task
       (пересылка владельцу в Telegram).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_business_secret
from app.core.timing import random_delay
from app.db.models import ReviewRequestStatus
from app.db.session import get_session
from app.services.crud import (
    create_review_request,
    find_latest_awaiting_feedback_request,
    find_latest_pending_request,
    get_business,
    is_opted_out,
    update_review_request,
)
from app.services.green_api import normalize_incoming_phone
from app.tasks.capture_negative import capture_negative_task, deliver_negative_feedback_task
from app.tasks.generate_review import generate_review_task
from app.tasks.send_review_request import send_review_request_task

logger = logging.getLogger(__name__)

router = APIRouter()

# --------------------------------------------------------------------------
# Pydantic Schemas
# --------------------------------------------------------------------------

class WebhookIntakePayload(BaseModel):
    business_id: str
    client_phone: str = Field(..., max_length=32)
    secret: str | None = None
    client_name: str | None = Field(None, max_length=255)
    service_name: str | None = Field(None, max_length=255)
    master_name: str | None = Field(None, max_length=255)
    location_id: str | None = None

    model_config = {"extra": "ignore"}

class GreenApiWebhookPayload(BaseModel):
    senderData: dict[str, Any] | None = None
    messageData: dict[str, Any] | None = None
    
    model_config = {"extra": "ignore"}


@router.post("/webhook/intake")
async def webhook_intake(payload: WebhookIntakePayload, session: AsyncSession = Depends(get_session)):
    business_id = payload.business_id
    client_phone = payload.client_phone

    if not business_id or not client_phone:
        raise HTTPException(status_code=422, detail="business_id и client_phone обязательны")

    business = await get_business(session, business_id)
    if not business or not verify_business_secret(business, payload.secret):
        # Намеренно одна и та же ошибка для "бизнес не найден" и "секрет неверный" —
        # чтобы не давать возможность перебором узнать, какие business_id существуют.
        raise HTTPException(status_code=401, detail="unauthorized")

    if await is_opted_out(session, client_phone, business_id):
        return {"status": "skipped"}

    request = await create_review_request(
        session,
        business_id=business_id,
        client_phone=client_phone,
        client_name=payload.client_name,
        service_name=payload.service_name,
        master_name=payload.master_name,
        location_id=payload.location_id,
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
async def webhook_reply(payload: GreenApiWebhookPayload, session: AsyncSession = Depends(get_session)):
    try:
        sender_phone = normalize_incoming_phone(payload.senderData["sender"])
        text = payload.messageData["textMessageData"]["textMessage"].strip()
    except (KeyError, AttributeError, TypeError):
        # Не текстовое сообщение (голосовое/картинка) или payload другого типа
        # события Green API (не incomingMessageReceived) — просто игнорируем.
        return {"status": "ignored"}

    request = await find_latest_pending_request(session, sender_phone)
    if request:
        if not text.isdigit() or not (1 <= int(text) <= 5):
            return {"status": "ignored"}

        rating = int(text)
        await update_review_request(
            session, request.id, status=ReviewRequestStatus.RATED, rating=rating
        )
        logger.info("webhook_reply: request %s получил оценку %s", request.id, rating)

        # Таски ставятся в очередь ДО commit (который случится в get_session
        # на выходе из роута) — тот же принцип, что и в webhook_intake:
        # celery worker подхватит задачу не раньше следующего polling-цикла
        # брокера, транзакция к этому моменту уже завершится.
        # countdown=2 (не .delay()) — умышленно: commit в get_session происходит
        # в коде ПОСЛЕ yield, то есть уже ПОСЛЕ отправки ответа клиенту (так
        # устроены FastAPI "dependencies with yield"). Без небольшой задержки
        # быстрый Celery-воркер теоретически может забрать таску и прочитать/
        # перезаписать строку ДО того, как этот commit долетит до Postgres —
        # тот же класс "silent commit"-гонки, что уже ловили на Этапе 2
        # (см. память проекта про timezone-баг). 2 секунды не заметны
        # клиенту, но полностью снимают гонку в реальном деплое.
        if rating >= 4:
            generate_review_task.apply_async(args=[str(request.id)], countdown=2)
        else:
            capture_negative_task.apply_async(args=[str(request.id)], countdown=2)

        return {"status": "ok"}

    # Не нашли активный запрос, ждущий оценку — возможно, это второе
    # сообщение клиента с деталями негатива (Этап 3.2).
    awaiting_feedback_request = await find_latest_awaiting_feedback_request(
        session, sender_phone
    )
    if awaiting_feedback_request:
        if not text:
            return {"status": "ignored"}

        logger.info(
            "webhook_reply: получен фидбэк по негативу для request %s",
            awaiting_feedback_request.id,
        )
        deliver_negative_feedback_task.delay(str(awaiting_feedback_request.id), text)
        return {"status": "ok"}

    return {"status": "no_match"}
