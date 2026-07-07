"""
app/main.py

Точка входа FastAPI. На Этапе 1 — только health-check и корректное
управление жизненным циклом async engine (SQLAlchemy). Роутеры из
app/api/* (webhooks, dashboard, redirect, billing, crm_yclients)
подключаются по мере готовности соответствующих этапов ТЗ — см. блок
"Роутеры" ниже, он уже содержит закомментированные include_router()
с точным путём импорта, чтобы не забыть подключить при реализации.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import async_engine

logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: ничего тяжёлого поднимать не нужно — async_engine уже создан
    как модульный синглтон в app/db/session.py (pool лениво открывает
    соединения по первому запросу).

    Shutdown: обязательно освобождаем connection pool движка, иначе при
    graceful restart (docker compose restart / деплой) соединения на
    Supabase pooler повисают до таймаута.
    """
    logger.info("ReviewFlow API starting up (env=%s)", settings.app_env)
    yield
    logger.info("ReviewFlow API shutting down, disposing DB engine pool")
    await async_engine.dispose()


app = FastAPI(
    title="ReviewFlow.kz API",
    description="ИИ-платформа автосбора отзывов в 2ГИС/Яндекс.Картах через WhatsApp",
    version="0.1.0",
    lifespan=lifespan,
)

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS нужен только для дашборда на Next.js (Этап 5); вебхуки Green API/CRM
# бьют напрямую в бэкенд без браузера, CORS на них не влияет.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception during {request.method} {request.url}: {exc}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Внутренняя ошибка сервера"}
    )


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """
    Критерий готовности Этапа 1: живой процесс uvicorn за reverse proxy.
    Не бьёт в БД/Redis намеренно — это liveness-проверка процесса,
    а не readiness всей системы (для readiness понадобится отдельный
    /health/ready, когда появятся реальные зависимости на роутах).
    """
    return {"status": "ok", "service": "reviewflow-api", "env": settings.app_env}


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"service": "ReviewFlow.kz API", "docs": "/docs"}


# --------------------------------------------------------------------------
# Роутеры — подключаются по мере реализации этапов ТЗ
# --------------------------------------------------------------------------
from app.api.auth import router as auth_router                  # Auth
from app.api.webhooks import router as webhooks_router          # Этап 2
from app.api.redirect import router as redirect_router          # Этап 3
from app.api.crm_yclients import router as crm_yclients_router  # Этап 4
from app.api.dashboard import router as dashboard_router        # Этап 5
# from app.api.billing import router as billing_router            # Этап 7

app.include_router(auth_router)
app.include_router(webhooks_router, tags=["webhooks"])
app.include_router(redirect_router, tags=["redirect"])
app.include_router(crm_yclients_router, tags=["crm"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
# app.include_router(billing_router, prefix="/api/billing", tags=["billing"])