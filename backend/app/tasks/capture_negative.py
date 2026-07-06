"""
app/tasks/capture_negative.py

Этап 3.2 ТЗ: сценарий "недовольный клиент" (оценка 1-3).

Два независимых Celery-таски, оба запускаются из app/api/webhooks.py:

1. capture_negative_task       — сразу после получения оценки 1-3: просит
   клиента уточнить детали, переводит ReviewRequest в AWAITING_FEEDBACK.
2. deliver_negative_feedback_task — когда клиент прислал уточняющий текст
   (второй /webhook/reply на тот же номер, распознанный по статусу
   AWAITING_FEEDBACK — см. app/services/crud.find_latest_awaiting_feedback_request):
   сохраняет фидбэк и пересылает его владельцу в Telegram.
"""

from __future__ import annotations

import logging

from app.db.models import ReviewRequestStatus
from app.db.session import get_sync_session
from app.services.crud import get_review_request_sync, update_status_sync
from app.services.green_api import GreenApiError, send_whatsapp_message
from app.services.telegram_notify import TelegramNotifyError, notify_owner_negative_feedback
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

ASK_DETAILS = (
    "Нам очень жаль это слышать. Расскажите, пожалуйста, что именно вам "
    "не понравилось — это поможет нам стать лучше."
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def capture_negative_task(self, request_id: str) -> None:
    with get_sync_session() as session:
        request = get_review_request_sync(session, request_id)
        client_phone = request.client_phone

    try:
        send_whatsapp_message(client_phone, ASK_DETAILS)
    except GreenApiError as exc:
        logger.warning(
            "capture_negative_task: попытка %s не удалась для %s: %s",
            self.request.retries + 1,
            request_id,
            exc,
        )
        raise self.retry(exc=exc)

    with get_sync_session() as session:
        update_status_sync(
            session, request_id, status=ReviewRequestStatus.AWAITING_FEEDBACK
        )


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def deliver_negative_feedback_task(self, request_id: str, feedback_text: str) -> None:
    with get_sync_session() as session:
        request = get_review_request_sync(session, request_id)
        business = request.business
        chat_id = business.telegram_chat_id
        client_phone = request.client_phone
        client_name = request.client_name
        rating = request.rating

    if not chat_id:
        # Бизнес ещё не подключил Telegram (Этап 5, onboarding) — фидбэк всё
        # равно сохраняем в БД (для дашборда/истории), но некому его слать.
        logger.info(
            "deliver_negative_feedback_task: у бизнеса нет telegram_chat_id, "
            "фидбэк по %s сохранён без уведомления",
            request_id,
        )
    else:
        try:
            notify_owner_negative_feedback(
                chat_id=chat_id,
                client_phone=client_phone,
                client_name=client_name,
                rating=rating or 0,
                feedback_text=feedback_text,
            )
        except TelegramNotifyError as exc:
            logger.warning(
                "deliver_negative_feedback_task: попытка %s не удалась для %s: %s",
                self.request.retries + 1,
                request_id,
                exc,
            )
            raise self.retry(exc=exc)

    with get_sync_session() as session:
        update_status_sync(
            session,
            request_id,
            status=ReviewRequestStatus.COMPLETED,
            owner_feedback=feedback_text,
        )
