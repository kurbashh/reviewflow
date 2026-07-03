"""
app/config.py

Единая точка чтения конфигурации. Все секреты и параметры окружения
читаются ТОЛЬКО отсюда — никаких os.getenv() и хардкода в сервисах/тасках.

Источники (по убыванию приоритета, стандартное поведение pydantic-settings):
1. Аргументы, переданные явно в Settings(...)
2. Переменные окружения (в проде — задаются в Docker Compose / Hetzner)
3. Файл .env (локальная разработка)
4. Значения по умолчанию, заданные ниже

Использование:
    from app.config import settings
    settings.database_url
"""

from functools import lru_cache

from pydantic import Field, PostgresDsn, RedisDsn, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Общие настройки приложения
    # ------------------------------------------------------------------
    app_env: str = Field(default="local", description="local/staging/production")
    debug: bool = Field(default=False)
    app_base_url: str = Field(
        default="https://reviewflow.kz",
        description="Публичный базовый URL backend'а (нужен для opt-out/redirect ссылок)",
    )

    # ------------------------------------------------------------------
    # База данных (Supabase используется строго как хостинг Postgres)
    # ------------------------------------------------------------------
    # Синхронный DSN (postgresql://...) — как правило, выдаёт сама Supabase.
    # Асинхронный вариант (postgresql+asyncpg://...) строится ниже через computed_field,
    # чтобы не дублировать креды в двух переменных окружения.
    database_url: PostgresDsn = Field(
        ...,
        description="DSN Supabase Postgres, формат postgresql://user:pass@host:5432/db",
    )
    db_echo: bool = Field(default=False, description="SQLAlchemy echo SQL-запросов (только для дебага)")
    db_pool_size: int = Field(default=5, ge=1)
    db_max_overflow: int = Field(default=10, ge=0)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def async_database_url(self) -> str:
        """Строка подключения для async-движка SQLAlchemy (используется в app/db/session.py)."""
        return str(self.database_url).replace("postgresql://", "postgresql+asyncpg://", 1)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sync_database_url(self) -> str:
        """
        Синхронная строка подключения для Celery-тасок (psycopg2/psycopg).
        Согласно принципу проекта: внутри Celery — синхронные CRUD-хелперы,
        отдельный sync-engine нужен именно им (app/services/crud.py).
        """
        return str(self.database_url).replace("postgresql://", "postgresql+psycopg://", 1)

    # ------------------------------------------------------------------
    # Redis / Celery
    # ------------------------------------------------------------------
    redis_url: RedisDsn = Field(default="redis://redis:6379/0")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def celery_broker_url(self) -> str:
        return str(self.redis_url)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def celery_result_backend(self) -> str:
        # Отдельная логическая БД Redis под result backend, чтобы не пересекаться с брокером
        return str(self.redis_url).rsplit("/", 1)[0] + "/1"

    # ------------------------------------------------------------------
    # Green API (WhatsApp)
    # ------------------------------------------------------------------
    green_api_instance_id: str = Field(default="", description="ID инстанса Green API")
    green_api_token: str = Field(default="", description="API-токен инстанса Green API")
    green_api_base_url: str = Field(default="https://api.green-api.com")

    # ------------------------------------------------------------------
    # OpenAI (генерация текста отзыва)
    # ------------------------------------------------------------------
    openai_api_key: str = Field(default="", description="Ключ OpenAI API")
    openai_model: str = Field(default="gpt-4o-mini")

    # ------------------------------------------------------------------
    # Telegram Bot API (уведомления о негативе)
    # ------------------------------------------------------------------
    telegram_bot_token: str = Field(default="")

    # ------------------------------------------------------------------
    # Kaspi Pay (биллинг подписки)
    # ------------------------------------------------------------------
    kaspi_pay_merchant_id: str = Field(default="")
    kaspi_pay_api_key: str = Field(default="")
    kaspi_pay_base_url: str = Field(default="https://api.kaspi.kz/pay")

    # ------------------------------------------------------------------
    # Resend (транзакционные письма)
    # ------------------------------------------------------------------
    resend_api_key: str = Field(default="")
    resend_from_email: str = Field(default="billing@reviewflow.kz")

    # ------------------------------------------------------------------
    # Безопасность
    # ------------------------------------------------------------------
    # Секрет для валидации вебхуков Green API / CRM на уровне app/core/security.py
    webhook_signing_secret: str = Field(
        ..., description="Общий секрет для HMAC-подписи входящих вебхуков"
    )
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["https://reviewflow.kz", "http://localhost:3000"]
    )


@lru_cache
def get_settings() -> Settings:
    """
    Синглтон настроек. lru_cache гарантирует, что .env / окружение
    парсится один раз за жизнь процесса (важно и для FastAPI, и для Celery worker'а).
    """
    return Settings()


settings = get_settings()