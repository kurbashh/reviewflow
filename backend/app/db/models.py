"""
app/db/models.py

SQLAlchemy 2.0 (Mapped-стиль) описания таблиц Postgres (хостинг — Supabase).
Схема соответствует Этапу 1 ТЗ ReviewFlow.kz.

Статусы и перечисляемые поля описаны через Python Enum + SQLAlchemy Enum,
чтобы избежать "магических строк" и удержать строгую типизацию,
требуемую принципами проекта.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _pg_enum(enum_cls: type[enum.Enum], *, name: str, length: int) -> SAEnum:
    """
    Обёртка над SAEnum с обязательным values_callable.

    БЕЗ values_callable SQLAlchemy по умолчанию хранит в БД .name члена enum
    (например "LIGHT"), а не .value ("light"), даже если enum отнаследован
    от str! Это расходится и с ТЗ (там статусы - "light"/"trial"/"pending"
    строчными буквами), и с ожиданиями любого кода, который читает эти
    колонки напрямую через SQL (дашборд, будущие CRM-репорты, ручные
    запросы в Supabase Studio). Баг подтверждён вживую: без этой обёртки
    INSERT/SELECT с методами вроде BusinessPlan.LIGHT падает с
    LookupError: 'light' is not among the defined enum values.
    """
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        length=length,
        values_callable=lambda cls: [member.value for member in cls],
    )


# --------------------------------------------------------------------------
# Enums
# --------------------------------------------------------------------------

class BusinessPlan(str, enum.Enum):
    LIGHT = "light"
    STANDARD = "standard"
    NETWORK = "network"


class BusinessStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAUSED = "paused"
    CHURNED = "churned"


class CrmType(str, enum.Enum):
    YCLIENTS = "yclients"


class ReviewRequestStatus(str, enum.Enum):
    PENDING = "pending"        # создан, ждёт отправки в Celery
    SENT = "sent"               # сообщение отправлено в WhatsApp
    RATED = "rated"              # клиент прислал оценку 1-5
    GENERATED = "generated"       # ИИ сгенерировал текст отзыва (промежуточный статус)
    AWAITING_FEEDBACK = "awaiting_feedback"
    # оценка 1-3: владельцу отправлен вопрос "что не понравилось", ждём
    # свободный текст от клиента (см. Этап 3.2 ТЗ, app/tasks/capture_negative.py)
    COMPLETED = "completed"        # цикл завершён (текст отправлен клиенту / негатив передан владельцу)
    OPTED_OUT = "opted_out"         # клиент в стоп-листе, запрос не отправлялся


class MessageDirection(str, enum.Enum):
    OUTBOUND = "outbound"
    INBOUND = "inbound"


# --------------------------------------------------------------------------
# User
# --------------------------------------------------------------------------

class User(Base):
    """Пользователь платформы (владелец одного или нескольких бизнесов)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    businesses: Mapped[list["Business"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"


# --------------------------------------------------------------------------
# Business
# --------------------------------------------------------------------------

class Business(Base):
    """Клиент платформы (салон, автосервис, сеть точек и т.д.)."""

    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)

    plan: Mapped[BusinessPlan] = mapped_column(
        _pg_enum(BusinessPlan, name="business_plan", length=20),
        default=BusinessPlan.LIGHT,
        nullable=False,
    )
    status: Mapped[BusinessStatus] = mapped_column(
        _pg_enum(BusinessStatus, name="business_status", length=20),
        default=BusinessStatus.TRIAL,
        nullable=False,
    )

    is_lifetime_access: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    subscription_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_manually_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    gis_2gis_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    yandex_maps_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    crm_type: Mapped[CrmType | None] = mapped_column(
        _pg_enum(CrmType, name="crm_type", length=20),
        nullable=True,
    )
    # Секрет для валидации входящих вебхуков конкретного бизнеса (см. core/security.py)
    crm_webhook_secret: Mapped[str] = mapped_column(String(128), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship(back_populates="businesses")
    locations: Mapped[list["Location"]] = relationship(
        back_populates="business", cascade="all, delete-orphan"
    )
    review_requests: Mapped[list["ReviewRequest"]] = relationship(
        back_populates="business", cascade="all, delete-orphan"
    )
    opted_out_numbers: Mapped[list["OptedOutNumber"]] = relationship(
        back_populates="business", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Business id={self.id} name={self.name!r} status={self.status}>"


# --------------------------------------------------------------------------
# Location
# --------------------------------------------------------------------------

class Location(Base):
    """Точка/филиал бизнеса — у каждой свой redirect_slug и свои ссылки на карты."""

    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Слаг для промежуточной redirect-страницы /go/{slug} (см. api/redirect.py)
    redirect_slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    # Ссылки на площадки могут быть переопределены на уровне точки,
    # иначе используется значение из Business
    gis_2gis_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    yandex_maps_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    business: Mapped["Business"] = relationship(back_populates="locations")
    review_requests: Mapped[list["ReviewRequest"]] = relationship(
        back_populates="location"
    )

    def __repr__(self) -> str:
        return f"<Location id={self.id} slug={self.redirect_slug!r}>"


# --------------------------------------------------------------------------
# ReviewRequest
# --------------------------------------------------------------------------

class ReviewRequest(Base):
    """Единичный цикл сбора отзыва: от вебхука CRM до готового текста."""

    __tablename__ = "review_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )

    client_phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    service_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    master_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[ReviewRequestStatus] = mapped_column(
        _pg_enum(ReviewRequestStatus, name="review_request_status", length=20),
        default=ReviewRequestStatus.PENDING,
        nullable=False,
        index=True,
    )

    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    generated_review: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Свободный текст, который недовольный клиент (оценка 1-3) прислал в ответ
    # на уточняющий вопрос ("что именно не понравилось") — Этап 3.2 ТЗ.
    # Пересылается владельцу в Telegram (app/services/telegram_notify.py) и
    # хранится здесь же для истории/дашборда (Этап 5).
    owner_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Флаг для дашборда: улажена ли жалоба (для Action-элементов)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    # DateTime(timezone=True) обязателен: весь код проекта (crud.py, тасках)
    # пишет сюда timezone-aware datetime.now(timezone.utc). Без timezone=True
    # колонка становится TIMESTAMP WITHOUT TIME ZONE, и asyncpg роняет запрос
    # с DataError "can't subtract offset-naive and offset-aware datetimes"
    # прямо в момент commit — подтверждено вживую на /webhook/reply.
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    business: Mapped["Business"] = relationship(back_populates="review_requests")
    location: Mapped["Location | None"] = relationship(back_populates="review_requests")
    messages: Mapped[list["MessageLog"]] = relationship(
        back_populates="review_request", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<ReviewRequest id={self.id} phone={self.client_phone} "
            f"status={self.status} rating={self.rating}>"
        )


# --------------------------------------------------------------------------
# MessageLog
# --------------------------------------------------------------------------

class MessageLog(Base):
    """Полный лог входящих/исходящих сообщений WhatsApp (для отладки и антифрода)."""

    __tablename__ = "message_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    review_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("review_requests.id", ondelete="CASCADE"), nullable=False
    )

    direction: Mapped[MessageDirection] = mapped_column(
        _pg_enum(MessageDirection, name="message_direction", length=10),
        nullable=False,
    )
    # Сырой payload от Green API (входящий вебхук) или отправленное тело сообщения
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    review_request: Mapped["ReviewRequest"] = relationship(back_populates="messages")

    def __repr__(self) -> str:
        return f"<MessageLog id={self.id} direction={self.direction}>"


# --------------------------------------------------------------------------
# OptedOutNumber
# --------------------------------------------------------------------------

class OptedOutNumber(Base):
    """Стоп-лист номеров, отписавшихся от рассылки (обязателен по Этапу 6 ТЗ)."""

    __tablename__ = "opted_out_numbers"
    __table_args__ = (
        UniqueConstraint("phone", "business_id", name="uq_opted_out_phone_business"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    opted_out_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    business: Mapped["Business"] = relationship(back_populates="opted_out_numbers")

    def __repr__(self) -> str:
        return f"<OptedOutNumber phone={self.phone} business_id={self.business_id}>"