"""
app/services/green_api.py

Клиент для отправки сообщений через Green API (WhatsApp).

Используется ТОЛЬКО из Celery-тасок (app/tasks/*), поэтому клиент
синхронный (httpx.Client), а не async — таски работают в sync-раннере
Celery, гонять там asyncio нет смысла (см. app/db/session.py docstring,
тот же принцип для БД применяем и здесь).

Приём сообщений (входящие вебхуки Green API) обрабатывается отдельно —
через POST /webhook/reply (app/api/webhooks.py), этот модуль не отвечает
за приём, только за отправку.
"""

from __future__ import annotations

import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class GreenApiError(RuntimeError):
    """Green API вернул ошибку или недоступен."""


def _to_chat_id(phone: str) -> str:
    """
    Приводит номер телефона к формату chatId, который ожидает Green API:
    только цифры + суффикс "@c.us", например "77001234567@c.us".
    """
    digits = re.sub(r"\D", "", phone)
    if not digits:
        raise GreenApiError(f"Некорректный номер телефона: {phone!r}")
    return f"{digits}@c.us"


def send_whatsapp_message(phone: str, text: str) -> dict:
    """
    Отправляет текстовое сообщение через Green API.

    Бросает GreenApiError при сетевой ошибке / ошибке ответа — Celery-таска
    (app/tasks/send_review_request.py) ловит это исключение сама и решает,
    ретраить или нет.
    """
    chat_id = _to_chat_id(phone)
    url = (
        f"{settings.green_api_base_url}"
        f"/waInstance{settings.green_api_instance_id}"
        f"/sendMessage/{settings.green_api_token}"
    )

    try:
        response = httpx.post(
            url,
            json={"chatId": chat_id, "message": text},
            timeout=15.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Green API: ошибка отправки на %s: %s", chat_id, exc)
        raise GreenApiError(str(exc)) from exc

    return response.json()
