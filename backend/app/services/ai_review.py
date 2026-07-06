"""
app/services/ai_review.py

Генерация текста отзыва через OpenAI Chat Completions API (Этап 3.1 ТЗ).

Используется ТОЛЬКО из Celery-таски app/tasks/generate_review.py — клиент
синхронный (OpenAI() без Async-префикса), т.к. таска работает в
sync-раннере Celery (тот же принцип, что и в app/services/green_api.py:
не гоняем asyncio внутри prefork-воркера).

Синтаксис клиента (client.chat.completions.create(...)) актуален для
openai>=1.0.0 и официально "поддерживается бессрочно" (OpenAI сама
рекомендует Responses API для новых проектов, но Chat Completions не
deprecated) — сверено с официальной документацией перед реализацией.
Модель конфигурируется через settings.openai_model (по умолчанию
gpt-4o-mini — самой дешёвой достаточно для короткого 2-3-предложного
отзыва, см. ТЗ Этап 3.1).
"""

from __future__ import annotations

import logging

from openai import APIError, OpenAI, OpenAIError

from app.config import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


class AiReviewError(RuntimeError):
    """OpenAI недоступен, вернул ошибку, либо ответ пуст."""


def _get_client() -> OpenAI:
    """
    Ленивая инициализация клиента (singleton на процесс воркера) — чтобы не
    создавать httpx-соединение на каждый вызов таски, но и не падать при
    импорте модуля, если OPENAI_API_KEY ещё не задан в текущем окружении
    (например, при локальном запуске без .env, до заполнения секретов).
    """
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
    return _client


PROMPT_TEMPLATE = """Сгенерируй короткий (2-3 предложения), естественно звучащий
отзыв на русском языке от лица клиента для 2ГИС/Яндекс.Карт.
Бизнес: {business_name} (сфера: {category})
Услуга: {service_name}
Мастер/специалист: {master_name}
Тон: живой, разговорный, без канцелярита, как будто пишет обычный человек.
Избегай штампов вроде "всё понравилось, персонал вежливый".
Ответь ТОЛЬКО текстом самого отзыва, без кавычек и без пояснений."""


def generate_review_text(
    *,
    business_name: str,
    category: str | None,
    service_name: str | None,
    master_name: str | None,
) -> str:
    """
    Возвращает сгенерированный текст отзыва.

    Бросает AiReviewError при сетевой/API-ошибке или пустом ответе —
    вызывающая Celery-таска (app/tasks/generate_review.py) сама решает,
    ретраить или нет.
    """
    prompt = PROMPT_TEMPLATE.format(
        business_name=business_name,
        category=category or "услуги",
        service_name=service_name or "визит",
        master_name=master_name or "специалист",
    )

    try:
        completion = _get_client().chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.9,  # выше дефолта: нужна вариативность формулировок
            # между разными клиентами одного бизнеса, а не один и тот же текст
        )
    except (APIError, OpenAIError) as exc:
        logger.warning("ai_review: OpenAI вернул ошибку: %s", exc)
        raise AiReviewError(str(exc)) from exc

    text = (completion.choices[0].message.content or "").strip()
    if not text:
        raise AiReviewError("OpenAI вернул пустой текст отзыва")

    return text
