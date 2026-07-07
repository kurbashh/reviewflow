# Техническое задание: ReviewFlow.kz
### ИИ-платформа автосбора отзывов в 2ГИС/Яндекс.Картах через WhatsApp
### Стек: Python (FastAPI)

---

## 0. Общая архитектура

```
[CRM клиента: YClients / amoCRM]
        │  webhook (визит завершён / сделка = "успешно")
        ▼
[FastAPI: POST /webhook/intake]
        │  валидация подписи, запись в БД, постановка задачи в очередь
        ▼
[Celery worker (Redis broker)]
        │  задержка (эмуляция человека, 5-30 мин) → выбор шаблона
        ▼
[Green API: отправка сообщения в WhatsApp]
        │
        ▼
[Клиент отвечает оценкой 1-5]
        │
        ▼
[Green API webhook → FastAPI: POST /webhook/reply]
        │
   ┌────┴────┐
 4-5          1-3
   │            │
   ▼            ▼
[Celery task:        [Celery task:
OpenAI генерация      Telegram Bot API →
отзыва]               уведомление владельцу]
   │
   ▼
[Отправка готового текста + редирект-ссылки в WhatsApp]
```

Принцип: вся система — тонкий слой бизнес-логики на Python поверх готовых API. Ты не поднимаешь свою очередь сообщений с нуля (Celery+Redis — готовые компоненты), не пишешь свой email/SMS-сервер, не администрируешь ничего сверх одной VPS.

**Стек:**
| Компонент | Технология | Зачем |
|---|---|---|
| Backend API | **FastAPI** (Python 3.12) | Приём вебхуков, REST API для дашборда |
| Фоновые задачи / очередь | **Celery + Redis** | Задержки, ретраи, генерация отзывов асинхронно |
| БД | **Supabase (Postgres)** | Хранение клиентов, логов, вебхуков — доступ через `SQLAlchemy` / `asyncpg`, Supabase используется только как хостинг Postgres + Auth, не как Edge Functions |
| ORM / миграции | **SQLAlchemy 2.0 + Alembic** | Модели, миграции схемы |
| WhatsApp-шлюз | **Green API** | Официальный резидент Astana Hub, оплата в тенге |
| Генерация текста | **OpenAI API** (`openai` SDK) / YandexGPT | Генерация уникального отзыва |
| Личный кабинет + лендинг | **Next.js на Vercel** (фронт отдельно от бэка) | Клиент видит статистику, настраивает интеграцию |
| Транзакционные письма | **Resend** (через HTTP API) | Биллинг, алерты об ошибках |
| Приём платежей | **Kaspi Pay API** | Подписка ИП |
| Деплой backend | **Hetzner VPS + Docker Compose** (FastAPI + Celery + Redis) | Один сервер, всё под контролем |

> Дашборд остаётся на Next.js/React, потому что для платного b2b-продукта важен вид "как у нормального SaaS", а не как у внутреннего скрипта. Backend полностью на Python — FastAPI отдаёт JSON API, фронт его просто потребляет. Это стандартное разделение, не конфликтует с желанием писать на Python.

---

## Структура проекта

```
reviewflow/
├── app/
│   ├── main.py                 # FastAPI entrypoint
│   ├── config.py                # env-переменные (pydantic-settings)
│   ├── db/
│   │   ├── models.py             # SQLAlchemy модели
│   │   ├── session.py            # engine, async session
│   │   └── migrations/           # Alembic
│   ├── api/
│   │   ├── webhooks.py           # /webhook/intake, /webhook/reply
│   │   ├── crm_yclients.py       # /webhook/crm/yclients/{business_id}
│   │   ├── dashboard.py          # REST API для фронта
│   │   ├── redirect.py           # /api/redirect/{slug}
│   │   └── billing.py            # Kaspi Pay callbacks
│   ├── services/
│   │   ├── green_api.py          # клиент для отправки/приёма WhatsApp
│   │   ├── ai_review.py          # генерация текста отзыва (OpenAI)
│   │   ├── telegram_notify.py    # уведомления владельцу
│   │   ├── redirect.py           # логика распределения 2ГИС/Яндекс/Google
│   │   └── crm_adapters/
│   │       └── yclients.py       # маппинг вебхука YClients
│   ├── tasks/
│   │   ├── celery_app.py         # конфигурация Celery
│   │   ├── send_review_request.py
│   │   ├── generate_review.py
│   │   ├── capture_negative.py
│   │   └── billing_check.py      # celery beat, суточная проверка оплат
│   └── core/
│       └── security.py           # проверка webhook-секретов
├── tests/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt / pyproject.toml
└── alembic.ini
```

---

## Этап 1. Инфраструктурный каркас (3-5 дней)

**Цель:** пустой, но полностью задеплоенный skeleton, который умеет принимать вебхук и писать в БД.

### Что сделать:
1. Создать проект в Supabase, поднять схему БД через Alembic-миграции
2. Поднять `docker-compose.yml` с сервисами: `api` (FastAPI/uvicorn), `worker` (Celery), `redis`
3. Арендовать Hetzner VPS (CX22, ~4-5€/мес)
4. Задеплоить Next.js-заглушку (лендинг + пустой `/dashboard`) на Vercel
5. Зарегистрировать инстанс Green API, подключить тестовый номер WhatsApp
6. Настроить Resend для транзакционных писем

### Схема БД (SQLAlchemy-модели → Postgres):

```python
#  
from sqlalchemy import String, ForeignKey, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

from .base import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    plan: Mapped[str] = mapped_column(String, default="light")  # light/standard/network
    gis_2gis_url: Mapped[str | None] = mapped_column(String, nullable=True)
    yandex_maps_url: Mapped[str | None] = mapped_column(String, nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String, nullable=True)
    crm_type: Mapped[str | None] = mapped_column(String, nullable=True)  # yclients/amocrm
    crm_webhook_secret: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="trial")  # trial/active/paused/churned
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    locations: Mapped[list["Location"]] = relationship(back_populates="business")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id"))
    name: Mapped[str] = mapped_column(String)
    redirect_slug: Mapped[str] = mapped_column(String, unique=True)

    business: Mapped["Business"] = relationship(back_populates="locations")


class ReviewRequest(Base):
    __tablename__ = "review_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id"))
    location_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    client_phone: Mapped[str] = mapped_column(String, nullable=False)
    client_name: Mapped[str | None] = mapped_column(String, nullable=True)
    service_name: Mapped[str | None] = mapped_column(String, nullable=True)
    master_name: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    # pending/sent/rated/generated/completed/opted_out
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    generated_review: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class MessageLog(Base):
    __tablename__ = "message_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    review_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("review_requests.id"))
    direction: Mapped[str] = mapped_column(String)  # outbound/inbound
    payload: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OptedOutNumber(Base):
    __tablename__ = "opted_out_numbers"

    phone: Mapped[str] = mapped_column(String, primary_key=True)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id"))
    opted_out_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

### Deploy-шаги:

```bash
# Локальная разработка
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn sqlalchemy alembic asyncpg celery redis \
            openai httpx pydantic-settings python-telegram-bot

# Миграции
alembic revision --autogenerate -m "init schema"
alembic upgrade head

# docker-compose.yml — сервисы api, worker, redis
docker compose up -d --build

# Деплой на Hetzner
scp -r ./reviewflow root@<vps-ip>:/opt/
ssh root@<vps-ip> "cd /opt/reviewflow && docker compose up -d"
# + Caddy/Nginx reverse proxy с HTTPS (Let's Encrypt) перед uvicorn

# Next.js на Vercel
npx create-next-app@latest reviewflow-dashboard
vercel deploy --prod
```

**Критерий готовности этапа:** POST-запрос на `/webhook/intake` создаёт запись в `review_requests`, Celery worker видит задачу в очереди Redis.

---

## Этап 2. Основной сценарий: webhook → WhatsApp → оценка (1-1.5 недели)

**Цель:** сквозной happy path без ИИ-генерации — просто отправка запроса оценки и приём ответа.

### 2.1 FastAPI роут `/webhook/intake`

```python
# app/api/webhooks.py
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import verify_business_secret
from app.tasks.send_review_request import send_review_request_task
from app.db.session import get_session
from app.services.crud import get_business, is_opted_out, create_review_request

router = APIRouter()


@router.post("/webhook/intake")
async def webhook_intake(payload: dict, session=Depends(get_session)):
    business_id = payload["business_id"]
    client_phone = payload["client_phone"]

    business = await get_business(session, business_id)
    if not business or not verify_business_secret(business, payload.get("secret")):
        raise HTTPException(status_code=401, detail="unauthorized")

    if await is_opted_out(session, client_phone, business_id):
        return {"status": "skipped"}

    request = await create_review_request(
        session,
        business_id=business_id,
        client_phone=client_phone,
        client_name=payload.get("client_name"),
        service_name=payload.get("service_name"),
        master_name=payload.get("master_name"),
    )

    # Ставим задачу в Celery с случайной задержкой (эмуляция человека)
    send_review_request_task.apply_async(args=[str(request.id)], countdown=random_delay())

    return {"status": "queued", "id": str(request.id)}
```

### 2.2 Celery-задача отправки

```python
# app/tasks/send_review_request.py
from app.tasks.celery_app import celery_app
from app.services.green_api import send_whatsapp_message
from app.services.crud import get_review_request_sync, update_status_sync

TEMPLATE = """Здравствуйте, {name}! Оцените, пожалуйста, ваш сегодняшний визит
в {business_name} по шкале от 1 до 5 звёзд 🙂
Ответьте одной цифрой.

Отписаться от рассылки: {opt_out_link}"""


@celery_app.task(bind=True, max_retries=3)
def send_review_request_task(self, request_id: str):
    request = get_review_request_sync(request_id)
    text = TEMPLATE.format(
        name=request.client_name or "уважаемый клиент",
        business_name=request.business.name,
        opt_out_link=f"https://reviewflow.kz/opt-out/{request.id}",
    )
    try:
        send_whatsapp_message(request.client_phone, text)
        update_status_sync(request_id, status="sent")
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

### 2.3 Приём ответа: `/webhook/reply`

```python
# app/api/webhooks.py (продолжение)
@router.post("/webhook/reply")
async def webhook_reply(payload: dict, session=Depends(get_session)):
    sender_phone = payload["senderData"]["sender"]
    text = payload["messageData"]["textMessageData"]["textMessage"].strip()

    request = await find_latest_pending_request(session, sender_phone)
    if not request:
        return {"status": "no_match"}

    if not text.isdigit() or not (1 <= int(text) <= 5):
        return {"status": "ignored"}

    rating = int(text)
    await update_review_request(session, request.id, status="rated", rating=rating)

    if rating >= 4:
        from app.tasks.generate_review import generate_review_task
        generate_review_task.delay(str(request.id))
    else:
        from app.tasks.capture_negative import capture_negative_task
        capture_negative_task.delay(str(request.id))

    return {"status": "ok"}
```

**Критерий готовности:** реальный тестовый номер получает сообщение, отвечает цифрой, статус в БД меняется корректно.

---

## Этап 3. ИИ-генерация отзыва + защита негатива (1 неделя)

### 3.1 Сценарий "лояльный клиент" (оценка 4-5)

```python
# app/services/ai_review.py
from openai import OpenAI

client = OpenAI()

PROMPT_TEMPLATE = """Сгенерируй короткий (2-3 предложения), естественно звучащий
отзыв на русском от лица клиента для 2ГИС/Яндекс.Карт.
Бизнес: {business_name} (сфера: {category})
Услуга: {service_name}
Мастер/специалист: {master_name}
Тон: живой, разговорный, без канцелярита, как будто пишет обычный человек.
Избегай штампов "всё понравилось, персонал вежливый"."""


def generate_review_text(business_name, category, service_name, master_name) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": PROMPT_TEMPLATE.format(
                business_name=business_name, category=category,
                service_name=service_name, master_name=master_name,
            ),
        }],
        max_tokens=150,
    )
    return resp.choices[0].message.content.strip()
```

```python
# app/tasks/generate_review.py
from app.tasks.celery_app import celery_app
from app.services.ai_review import generate_review_text
from app.services.green_api import send_whatsapp_message
from app.services.redirect import get_redirect_link
from app.services.crud import get_review_request_sync, update_status_sync


@celery_app.task
def generate_review_task(request_id: str):
    request = get_review_request_sync(request_id)
    review_text = generate_review_text(
        request.business.name, request.business.category,
        request.service_name, request.master_name,
    )
    link = get_redirect_link(request.location_id)

    message = f"""Спасибо за высокую оценку! 🙌
Вот текст, который можно скопировать и вставить в отзыв:

"{review_text}"

Оставить отзыв здесь: {link}"""

    send_whatsapp_message(request.client_phone, message)
    update_status_sync(request_id, status="completed", generated_review=review_text)
```

Стоимость на генерацию ≈ 0.5 ₸ (закладывается в юнит-экономику), модель — `gpt-4o-mini`, смысла брать дорогую модель нет.

### 3.2 Сценарий "недовольный клиент" (оценка 1-3)

```python
# app/tasks/capture_negative.py
from app.tasks.celery_app import celery_app
from app.services.green_api import send_whatsapp_message
from app.services.crud import get_review_request_sync

ASK_DETAILS = "Нам очень жаль это слышать. Расскажите, пожалуйста, что именно вам не понравилось — это поможет нам стать лучше."


@celery_app.task
def capture_negative_task(request_id: str):
    request = get_review_request_sync(request_id)
    send_whatsapp_message(request.client_phone, ASK_DETAILS)
    # Ответ клиента придёт на /webhook/reply повторно —
    # там нужна доп. логика: если request.status == "rated" and rating <= 3
    # и это re-reply, то пересылать текст в Telegram, а не парсить как рейтинг
```

```python
# app/services/telegram_notify.py
import httpx
from app.config import settings


async def notify_owner(chat_id: str, client_feedback: str, client_phone: str):
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    text = f"⚠️ Негативный отзыв (перехвачен)\nОт: {client_phone}\n\n{client_feedback}"
    async with httpx.AsyncClient() as http:
        await http.post(url, json={"chat_id": chat_id, "text": text})
```

### 3.3 Редирект-система (защита от алгоритмов 2ГИС)

Next.js route `/go/[slug]` — промежуточная страница на фронте, а логика веса/выбора площадки — небольшой FastAPI-эндпоинт, который фронт дергает:

```python
# app/api/redirect.py
import random
from fastapi import APIRouter
from app.services.crud import get_location_by_slug, log_redirect_click

router = APIRouter()


@router.get("/api/redirect/{slug}")
async def resolve_redirect(slug: str):
    location = await get_location_by_slug(slug)
    await log_redirect_click(location.id)

    # Простое взвешенное распределение, чтобы не создавать паттерн
    # "все переходы идут по одной прямой ссылке в 2ГИС"
    target = random.choices(
        population=[location.gis_2gis_url, location.yandex_maps_url],
        weights=[70, 30],
        k=1,
    )[0]
    return {"redirect_url": target}
```

**Критерий готовности:** полный цикл — визит → сообщение → оценка → (генерация отзыва ИЛИ перехват негатива) — работает на 2-3 живых тестовых кейсах.

---

## Этап 4. Интеграции с CRM (1-2 недели на первую, дальше быстрее)

Начать с **YClients** (самая массовая CRM в бьюти-нише — целевая ниша №1).

- Изучить YClients Webhooks API (событие "визит завершён")
- Написать адаптер `app/services/crm_adapters/yclients.py`, который маппит поля YClients-вебхука в формат `/webhook/intake`
- YClients шлёт вебхук напрямую на твой FastAPI-эндпоинт `/webhook/crm/yclients` — отдельный роут-обёртка, который транслирует в общий `create_review_request`

```python
# app/api/crm_yclients.py
from fastapi import APIRouter, Depends
from app.services.crm_adapters.yclients import map_yclients_payload
from app.api.webhooks import webhook_intake
from app.db.session import get_session

router = APIRouter()


@router.post("/webhook/crm/yclients/{business_id}")
async def yclients_webhook(business_id: str, payload: dict, session=Depends(get_session)):
    normalized = map_yclients_payload(payload, business_id)
    return await webhook_intake(normalized, session)
```

После YClients — amoCRM и Битрикс24 по мере спроса клиентов: архитектура позволяет добавлять новые адаптеры как отдельные файлы в `crm_adapters/`, не трогая ядро.

---

## Этап 5. Личный кабинет (Dashboard) (1-1.5 недели)

Next.js + FastAPI отдаёт JSON через `app/api/dashboard.py`:

```python
# app/api/dashboard.py
from fastapi import APIRouter, Depends
from app.services.crud import get_business_stats
from app.db.session import get_session

router = APIRouter()


@router.get("/api/dashboard/{business_id}/stats")
async def dashboard_stats(business_id: str, session=Depends(get_session)):
    return await get_business_stats(session, business_id)
    # {"sent": 120, "rated": 95, "avg_rating": 4.6, "reviews_completed": 78, "negative_captured": 12}
```

Минимальный набор экранов:
1. **Onboarding** — подключение CRM (ввод API-ключа/секрета), ссылки на 2ГИС/Яндекс.Карты
2. **Dashboard** — график роста рейтинга, счётчик отправленных/полученных отзывов, конверсия
3. **Негатив** — лента перехваченного негатива
4. **Биллинг** — статус подписки, оплата через Kaspi Pay

Вкладывай время в этот этап после того, как ядро (Этапы 1-3) стабильно работает вживую.

---

## Этап 6. Защита от рисков (встраивается параллельно, не откладывать)

| Риск | Реализация защиты |
|---|---|
| Блокировка номера WhatsApp | Только триггерные сообщения, случайные задержки 5-30 мин (`countdown=random_delay()` в Celery), обязательная команда отписки, rate-limit 1 запрос на клиента в N дней (проверка в `create_review_request`) |
| Модерация 2ГИС отслеживает прямые ссылки | Redirect-система из Этапа 3.3, взвешенное распределение по площадкам |
| Утечка API-ключей CRM/Green API | `.env` + `pydantic-settings`, секреты никогда не коммитятся, на проде — переменные окружения Docker/Hetzner |
| Спам-жалобы на бота | Rate-limiting на уровне FastAPI (`slowapi` или Redis-based throttling), honeypot на слишком частые ответы с одного номера |

---

## Этап 7. Billing и юр. оформление (параллельно с Этапом 5)

- Регистрация ИП на упрощённой декларации (3% с оборота)
- Интеграция Kaspi Pay API (`app/api/billing.py`) для приёма оплаты подписки — или выставление счетов вручную на первых 10-15 клиентах, пока биллинг не отлажен
- Cron-задача Celery (`celery beat`) раз в сутки проверяет просрочку и переводит `status = paused`

```python
# app/tasks/billing_check.py
from celery.schedules import crontab
from app.tasks.celery_app import celery_app

celery_app.conf.beat_schedule = {
    "check-overdue-subscriptions": {
        "task": "app.tasks.billing_check.check_overdue",
        "schedule": crontab(hour=3, minute=0),  # раз в сутки в 3:00
    },
}


@celery_app.task
def check_overdue():
    ...  # найти business со status=active и просроченной оплатой → status=paused
```

---

## Порядок запуска (сводная таблица)

| Этап | Срок | Результат |
|---|---|---|
| 1. Инфраструктура | 3-5 дней | Задеплоенный skeleton, БД готова, Celery видит задачи |
| 2. Happy path (без ИИ) | 1-1.5 нед | Запрос оценки → приём ответа работает вживую |
| 3. ИИ-генерация + защита негатива | 1 нед | Полный цикл продукта |
| 4. Первая CRM-интеграция (YClients) | 1-2 нед | Автотриггер без ручного ввода данных |
| 5. Личный кабинет | 1-1.5 нед | Демо для продаж и партнёров |
| 6. Защита от рисков | параллельно | Встроено с самого начала |
| 7. Биллинг + ИП | параллельно | Готовность принимать платежи |

**Итого до продаваемого MVP: 5-7 недель** при работе в одиночку в вечернее/выходное время.

---

## Что нужно от тебя прямо сейчас, чтобы начать

1. Завести аккаунты: Supabase (только как Postgres-хостинг), Hetzner, Green API (тестовый номер), OpenAI API
2. Выбрать 2-3 реальных заведения (можно знакомых) для пилота — тестировать сквозной сценарий ещё до продажи
3. Решить: начинать с YClients-интеграции сразу, или первую версию тестировать без CRM вообще — вручную триггерить `/webhook/intake` через простую HTML-форму (это быстрее для проверки самого ядра: WhatsApp → оценка → генерация)
4. Поднять локально `docker-compose.yml` с FastAPI + Celery + Redis — это база, с которой стартуем в Этапе 1
