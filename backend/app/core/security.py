"""
app/core/security.py

Проверка подлинности входящих вебхуков. На Этапе 2 источник вебхука —
доверенный клиент (форма/CRM), который знает business.crm_webhook_secret,
поэтому проверка — простое сравнение секретов константным по времени
способом (hmac.compare_digest), чтобы не давать возможность подобрать
секрет через тайминг-атаку.

На Этапе 4 (CRM-интеграции) сюда же добавится HMAC-проверка подписи
самих CRM-провайдеров (YClients и др. подписывают payload отдельно).
"""

from __future__ import annotations

import hmac

from app.db.models import Business


def verify_business_secret(business: Business, provided_secret: str | None) -> bool:
    """
    Сверяет секрет, переданный в payload вебхука, с business.crm_webhook_secret.

    Возвращает False (а не бросает исключение) на любой некорректный ввод —
    роут сам решает, что делать с отказом (обычно HTTPException 401).
    """
    if not provided_secret:
        return False
    return hmac.compare_digest(provided_secret, business.crm_webhook_secret)
