"""
app/core/timing.py

Хелперы, связанные со временем/задержками. Вынесены отдельно от security.py,
т.к. используются и в API-слое (постановка Celery-задачи), и потенциально
в тасках (ретраи), а не только в контексте безопасности.
"""

from __future__ import annotations

import random

# Диапазон задержки перед отправкой запроса на оценку — эмуляция того,
# что сообщение написал человек, а не бот сразу после завершения визита
# (см. Этап 6 ТЗ, защита от блокировки номера WhatsApp).
_MIN_DELAY_SECONDS = 5 * 60
_MAX_DELAY_SECONDS = 30 * 60


def random_delay() -> int:
    """Случайная задержка в секундах для countdown= Celery-задачи (5-30 минут)."""
    return random.randint(_MIN_DELAY_SECONDS, _MAX_DELAY_SECONDS)
