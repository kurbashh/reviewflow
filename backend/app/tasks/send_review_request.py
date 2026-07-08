"""
app/tasks/send_review_request.py

Этап 2.2 ТЗ: асинхронная отправка запроса на оценку в WhatsApp через
Green API, с ретраями при сетевых сбоях.
"""

from __future__ import annotations

import logging

from app.db.models import ReviewRequestStatus
from app.db.session import get_sync_session
from app.services.crud import get_review_request_sync, update_status_sync
from app.services.green_api import GreenApiError, send_whatsapp_message
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

TEMPLATE = (
    "Здравствуйте, {name}! Оцените, пожалуйста, ваш сегодняшний визит "
    "в {business_name} по шкале от 1 до 5 звёзд 🙂\n"
    "Ответьте одной цифрой.\n\n"
    "(Отправьте «стоп» или «stop» в ответ, если больше не хотите получать наши сообщения)"
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_review_request_task(self, request_id: str) -> None:
    with get_sync_session() as session:
        request = get_review_request_sync(session, request_id)

        text = TEMPLATE.format(
            name=request.client_name or "уважаемый клиент",
            business_name=request.business.name,
        )

        try:
            send_whatsapp_message(request.client_phone, text)
        except GreenApiError as exc:
            logger.warning(
                "send_review_request_task: попытка %s не удалась для %s: %s",
                self.request.retries + 1,
                request_id,
                exc,
            )
            raise self.retry(exc=exc)

        update_status_sync(session, request_id, status=ReviewRequestStatus.SENT)


