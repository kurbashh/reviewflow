"""
app/tasks/generate_review.py

Этап 3.1 ТЗ: сценарий "лояльный клиент" (оценка 4-5).

Генерирует уникальный текст отзыва через OpenAI (app/services/ai_review.py),
отправляет его клиенту в WhatsApp вместе со ссылкой на площадку
(app/services/redirect.py) и переводит ReviewRequest в статус COMPLETED.

Запускается из app/api/webhooks.py::webhook_reply при rating >= 4.
"""

from __future__ import annotations

import logging

from app.db.models import ReviewRequestStatus, BusinessPlan
from app.db.session import get_sync_session
from app.services.ai_review import AiReviewError, generate_review_text
from app.services.crud import get_review_request_sync, update_status_sync
from app.services.green_api import GreenApiError, send_whatsapp_message
from app.services.redirect import build_go_link
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

MESSAGE_TEMPLATE = (
    "Спасибо за высокую оценку! 🙌\n"
    "Вот текст, который можно скопировать и вставить в отзыв:\n\n"
    '"{review_text}"\n\n'
    "Оставить отзыв здесь: {link}"
)

SIMPLE_MESSAGE_TEMPLATE = (
    "Спасибо за высокую оценку! 🙌\n\n"
    "Оставить отзыв здесь: {link}"
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_review_task(self, request_id: str) -> None:
    # ------------------------------------------------------------------
    # Шаг 1: генерация текста через OpenAI (если ещё не сгенерирован —
    # request.generated_review уже может быть заполнен предыдущей попыткой,
    # см. ветку GreenApiError ниже: не платим за повторную генерацию у OpenAI
    # при ретрае, если отправка в WhatsApp упала уже ПОСЛЕ успешной генерации).
    # ------------------------------------------------------------------
    with get_sync_session() as session:
        request = get_review_request_sync(session, request_id)
        business = request.business
        review_text = request.generated_review
        client_phone = request.client_phone
        location = request.location

    if not review_text and business.plan != BusinessPlan.LIGHT:
        try:
            review_text = generate_review_text(
                business_name=business.name,
                category=business.category,
                service_name=request.service_name,
                master_name=request.master_name,
            )
        except AiReviewError as exc:
            logger.warning(
                "generate_review_task: OpenAI попытка %s не удалась для %s: %s",
                self.request.retries + 1,
                request_id,
                exc,
            )
            raise self.retry(exc=exc)

        with get_sync_session() as session:
            update_status_sync(
                session,
                request_id,
                status=ReviewRequestStatus.GENERATED,
                generated_review=review_text,
            )

    # ------------------------------------------------------------------
    # Шаг 2: отправка готового текста + ссылки в WhatsApp
    # ------------------------------------------------------------------
    link = build_go_link(location, business)
    if business.plan == BusinessPlan.LIGHT:
        message = SIMPLE_MESSAGE_TEMPLATE.format(link=link)
    else:
        message = MESSAGE_TEMPLATE.format(review_text=review_text, link=link)

    try:
        send_whatsapp_message(client_phone, message)
    except GreenApiError as exc:
        logger.warning(
            "generate_review_task: Green API попытка %s не удалась для %s: %s",
            self.request.retries + 1,
            request_id,
            exc,
        )
        # Статус уже GENERATED (закоммичен выше) — при следующей попытке
        # review_text будет взят из БД без повторного обращения к OpenAI.
        raise self.retry(exc=exc)

    with get_sync_session() as session:
        update_status_sync(
            session,
            request_id,
            status=ReviewRequestStatus.COMPLETED,
            generated_review=review_text,
        )
