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

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_business_secret
from app.core.timing import random_delay
from app.core.limiter import limiter
from app.db.models import ReviewRequestStatus, BusinessStatus, BusinessPlan
from app.db.session import get_session
from app.services.crud import (
    create_review_request,
    find_latest_awaiting_feedback_request,
    find_latest_pending_request,
    get_business,
    is_opted_out,
    update_review_request,
    has_recent_request,
    opt_out_client,
    find_latest_request_any_status,
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
@limiter.limit("30/minute")
async def webhook_intake(request: Request, payload: WebhookIntakePayload, session: AsyncSession = Depends(get_session)):
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
        
    if await has_recent_request(session, client_phone, business_id, days=7):
        logger.info("webhook_intake: client %s rate limited (already requested in last 7 days)", client_phone)
        return {"status": "rate_limited"}

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

    is_active = business.is_lifetime_access or (business.status != BusinessStatus.CHURNED and not business.is_manually_paused)
    
    if is_active:
        send_review_request_task.apply_async(
            args=[str(request.id)], countdown=random_delay()
        )
        return {"status": "queued", "id": str(request.id)}
    else:
        logger.info("webhook_intake: business %s is paused or churned, skipping celery task", business_id)
        return {"status": "paused_or_churned", "id": str(request.id)}


@router.post("/webhook/reply")
@limiter.limit("60/minute")
async def webhook_reply(request: Request, payload: GreenApiWebhookPayload, session: AsyncSession = Depends(get_session)):
    try:
        sender_phone = normalize_incoming_phone(payload.senderData["sender"])
        text = payload.messageData["textMessageData"]["textMessage"].strip()
    except (KeyError, AttributeError, TypeError):
        # Не текстовое сообщение (голосовое/картинка) или payload другого типа
        # события Green API (не incomingMessageReceived) — просто игнорируем.
        return {"status": "ignored"}

    if text.lower() in ["стоп", "stop", "отписаться"]:
        latest_req = await find_latest_request_any_status(session, sender_phone)
        if latest_req:
            await opt_out_client(session, sender_phone, str(latest_req.business_id))
            logger.info("webhook_reply: client %s opted out", sender_phone)
        return {"status": "opted_out"}

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
        # Переводим запрос в COMPLETED, чтобы больше не принимать сообщения
        # от этого клиента по этому инциденту (защита от honeypot-спама).
        await update_review_request(
            session, awaiting_feedback_request.id, status=ReviewRequestStatus.COMPLETED
        )
        deliver_negative_feedback_task.delay(str(awaiting_feedback_request.id), text)
        return {"status": "ok"}

    return {"status": "no_match"}
