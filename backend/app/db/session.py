"""
app/db/session.py

Два независимых движка на одну и ту же БД (Supabase Postgres):

1. Async engine + AsyncSession — для FastAPI (app/api/*). Используется
   вместе с зависимостью `get_session` через Depends().
2. Sync engine + Session — только для Celery-тасок (app/tasks/*).
   Celery-воркер работает в prefork-модели, гонять asyncio event loop
   внутри синхронного task-раннера — источник трудноуловимых багов
   (см. принцип проекта №2), поэтому там используется обычный
   синхронный psycopg-драйвер и sync-хелперы из app/services/crud.py.

Оба движка читают DSN из app/config.py — никаких URL, собранных вручную
в этом файле.
"""

from collections.abc import AsyncGenerator, Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# --------------------------------------------------------------------------
# Async engine — для FastAPI
# --------------------------------------------------------------------------

async_engine: AsyncEngine = create_async_engine(
    settings.async_database_url,
    echo=settings.db_echo,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,  # проверка "мёртвых" соединений — критично для Supabase pooler'а
    connect_args={
        "statement_cache_size": 0,  # Отключает подготовленные выражения (критично для PgBouncer/Supabase Pooler)
    },
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency. Использование:

        @router.post("/webhook/intake")
        async def webhook_intake(payload: dict, session: AsyncSession = Depends(get_session)):
            ...

    Гарантирует commit при успешном завершении роута, rollback при исключении
    и закрытие сессии в любом случае.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# --------------------------------------------------------------------------
# Sync engine — только для Celery-тасок
# --------------------------------------------------------------------------

sync_engine: Engine = create_engine(
    settings.sync_database_url,
    echo=settings.db_echo,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,
)

SyncSessionLocal: sessionmaker[Session] = sessionmaker(
    bind=sync_engine,
    expire_on_commit=False,
    autoflush=False,
)


@contextmanager
def get_sync_session() -> Generator[Session, None, None]:
    """
    Контекст-менеджер для синхронных CRUD-хелперов внутри Celery-тасок.
    Использование:

        @celery_app.task(bind=True, max_retries=3)
        def send_review_request_task(self, request_id: str):
            with get_sync_session() as session:
                request = get_review_request_sync(session, request_id)
                ...

    Коммит/rollback/close обрабатываются автоматически, как и в async-версии.
    """
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()