"""
app/services/redirect.py

Этап 3.3 ТЗ: защита от алгоритмов модерации 2ГИС, которые отслеживают
паттерн "все переходы идут по одной и той же прямой ссылке".

Два разных момента времени, две разные функции:

1. build_go_link()      — вызывается СРАЗУ при генерации сообщения клиенту
                           (app/tasks/generate_review.py). Возвращает
                           стабильную промежуточную ссылку /go/{slug} —
                           САМА площадка (2ГИС/Яндекс) ещё не выбрана.
2. resolve_redirect_target() — вызывается в момент клика клиента по ссылке
                           (app/api/redirect.py, GET /api/redirect/{slug}).
                           Именно здесь происходит взвешенный случайный
                           выбор площадки — так разные клиенты одного и
                           того же бизнеса попадают на разные площадки,
                           даже если ссылка в сообщении у всех одинаковая.
"""

from __future__ import annotations

import random

from app.config import settings
from app.db.models import Business, Location

# 70/30 в пользу 2ГИС по умолчанию (см. ТЗ Этап 3.3) — 2ГИС обычно приоритетнее
# для локального бизнеса в Казахстане, но соотношение специально не 100/0,
# чтобы не создавать паттерн "весь трафик идёт в одну сторону".
DEFAULT_WEIGHTS_2GIS_YANDEX = (70, 30)


class RedirectResolutionError(RuntimeError):
    """У локации/бизнеса не задано ни одной ссылки на площадку."""


def build_go_link(location: Location | None, business: Business) -> str:
    """
    Ссылка, которая уходит клиенту в WhatsApp-сообщении.

    Если у ReviewRequest есть привязанная Location со своим redirect_slug —
    используем промежуточную redirect-страницу фронтенда (/go/{slug}),
    которая на клике дёргает GET /api/redirect/{slug} (см. app/api/redirect.py)
    и уже там происходит взвешенный выбор площадки.

    Если локации нет (бизнес ещё не завёл филиалы отдельно, Этап 4/5) —
    деградируем до прямой ссылки на уровне бизнеса, выбранной сразу здесь.
    Это менее устойчиво к модерации 2ГИС, чем redirect-страница, но лучше,
    чем не отправлять клиенту ссылку вообще.
    """
    if location is not None and location.redirect_slug:
        return f"{settings.app_base_url.rstrip('/')}/go/{location.redirect_slug}"

    return resolve_redirect_target(location=None, business=business)


def resolve_redirect_target(location: Location | None, business: Business) -> str:
    """
    Взвешенный случайный выбор целевой площадки.

    Приоритет ссылок: сначала уровня Location (если задан и не пуст),
    иначе — уровня Business. Площадки без непустой ссылки исключаются
    из выбора целиком (weights пересчитываются под оставшиеся варианты).
    """
    gis_2gis_url = (location.gis_2gis_url if location else None) or business.gis_2gis_url
    yandex_maps_url = (
        location.yandex_maps_url if location else None
    ) or business.yandex_maps_url

    candidates: list[tuple[str, int]] = []
    weight_2gis, weight_yandex = DEFAULT_WEIGHTS_2GIS_YANDEX
    if gis_2gis_url:
        candidates.append((gis_2gis_url, weight_2gis))
    if yandex_maps_url:
        candidates.append((yandex_maps_url, weight_yandex))

    if not candidates:
        raise RedirectResolutionError(
            f"У бизнеса {business.id} (и локации {location.id if location else None}) "
            "не задано ни одной ссылки на площадку"
        )

    urls, weights = zip(*candidates)
    return random.choices(population=urls, weights=weights, k=1)[0]
