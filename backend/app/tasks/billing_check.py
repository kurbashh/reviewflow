"""
app/tasks/billing_check.py

Этап 6: суточная проверка просроченных подписок (status=active -> status=paused).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.models import Business, BusinessStatus
from app.db.session import get_sync_session
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task
def check_expired_subscriptions() -> None:
    """
    Ищет бизнесы, у которых закончилась подписка, и ставит им статус PAUSED.
    Запускается по расписанию через Celery Beat раз в сутки.
    """
    now = datetime.now(timezone.utc)

    with get_sync_session() as session:
        stmt = select(Business).where(
            Business.status == BusinessStatus.ACTIVE,
            Business.is_lifetime_access == False,
            Business.subscription_ends_at < now,
        )
        result = session.execute(stmt)
        expired_businesses = result.scalars().all()

        if not expired_businesses:
            logger.info("check_expired_subscriptions: нет просроченных подписок.")
            return

        for business in expired_businesses:
            logger.info(
                "Приостановка подписки для бизнеса %s (истекла %s)",
                business.id,
                business.subscription_ends_at,
            )
            business.status = BusinessStatus.PAUSED

        session.commit()
        logger.info("check_expired_subscriptions: отключено %d подписок.", len(expired_businesses))
