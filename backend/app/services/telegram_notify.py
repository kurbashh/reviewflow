"""
app/services/telegram_notify.py

Уведомление владельца бизнеса о перехваченном негативе через Telegram Bot API
(Этап 3.2 ТЗ).

Синхронный клиент (httpx.post, не AsyncClient) — как и app/services/green_api.py,
вызывается только из Celery-таски (app/tasks/capture_negative.py), которая
работает в sync-раннере.

Метод sendMessage и формат ответа Telegram Bot API стабильны с момента
запуска Bot API и не менялись годами — отдельной сверки с документацией
на этот вызов не требуется (в отличие от OpenAI SDK, где за последние годы
были ломающие изменения самого клиента).
"""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class TelegramNotifyError(RuntimeError):
    """Telegram Bot API недоступен или вернул ошибку."""


def notify_owner_negative_feedback(
    *,
    chat_id: str,
    client_phone: str,
    client_name: str | None,
    rating: int,
    feedback_text: str,
) -> None:
    """
    Отправляет владельцу бизнеса сообщение о негативном отзыве, перехваченном
    до публикации на 2ГИС/Яндекс.Картах.

    Бросает TelegramNotifyError при сетевой ошибке/ошибке API — вызывающая
    Celery-таска сама решает, ретраить ли отправку.

    Если у бизнеса не настроен telegram_chat_id (Business.telegram_chat_id
    пуст), функция не вызывается вовсе — эта проверка на стороне таски,
    здесь предполагается непустой chat_id.
    """
    stars = "⭐" * rating
    text = (
        "⚠️ Негативный отзыв перехвачен\n\n"
        f"Оценка: {stars} ({rating}/5)\n"
        f"Клиент: {client_name or 'не указан'}\n"
        f"Телефон: {client_phone}\n\n"
        f"Комментарий:\n{feedback_text}"
    )

    url = f"{settings.telegram_api_base_url.rstrip('/')}/bot{settings.telegram_bot_token}/sendMessage"

    try:
        response = httpx.post(
            url,
            json={"chat_id": chat_id, "text": text},
            timeout=15.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("telegram_notify: ошибка отправки владельцу %s: %s", chat_id, exc)
        raise TelegramNotifyError(str(exc)) from exc

    payload = response.json()
    if not payload.get("ok", False):
        # Telegram отвечает 200 OK даже на некоторые логические ошибки
        # (например, бот заблокирован пользователем) — description содержит причину.
        logger.warning(
            "telegram_notify: Telegram API вернул ok=false для %s: %s",
            chat_id,
            payload.get("description"),
        )
        raise TelegramNotifyError(payload.get("description", "unknown Telegram API error"))
