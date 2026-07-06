"""
app/tasks/celery_app.py

Единая точка инициализации Celery. Все таски проекта (app/tasks/*.py)
регистрируются здесь через include — НЕ через autodiscover_tasks(),
т.к. у нас плоский список модулей, а не Django-style app registry.

Запуск (см. docker-compose.yml):
    celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
    celery -A app.tasks.celery_app beat --loglevel=info
"""

from celery import Celery

from app.config import settings

celery_app = Celery(
    "reviewflow",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.send_review_request",
        "app.tasks.generate_review",
        "app.tasks.capture_negative",
        "app.tasks.billing_check",
    ],
)

celery_app.conf.update(
    # Сериализация — только json, никакого pickle (небезопасно на внешнем брокере)
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Almaty",
    enable_utc=True,
    # Начиная с Celery 5.x/6.0 broker_connection_retry_on_startup нужно задавать явно,
    # иначе воркер падает при недоступном Redis в момент запуска контейнера
    # (актуально для docker compose, где redis может стартовать на пару секунд позже worker'а).
    broker_connection_retry_on_startup=True,
    # Late ack — таска считается выполненной только ПОСЛЕ успешного завершения,
    # а не в момент получения воркером. Критично для send_review_request/generate_review:
    # если воркер упадёт посреди отправки в Green API, таска не потеряется, а вернётся в очередь.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # По одной задаче на воркер за раз — справедливое распределение между процессами,
    # т.к. наши таски почти всегда I/O-bound (внешние HTTP-запросы к Green API/OpenAI),
    # а не CPU-bound батчи.
    worker_prefetch_multiplier=1,
    # Дефолтные ретраи для тасок с внешними HTTP-вызовами (Green API, OpenAI, Telegram).
    # Конкретные таски могут переопределять max_retries/countdown через self.retry(...).
    task_default_retry_delay=60,
    task_time_limit=120,       # hard limit — воркер убьёт таску, если зависнет
    task_soft_time_limit=90,   # soft limit — таска получит шанс на graceful cleanup
    result_expires=86400,      # результаты тасок не нужны дольше суток
)

# --------------------------------------------------------------------------
# Celery Beat — периодические задачи (Этап 7 ТЗ: суточная проверка биллинга)
# --------------------------------------------------------------------------
# ВАЖНО: не регистрируем beat_schedule, пока app.tasks.billing_check.check_overdue
# не реализован (сейчас billing_check.py — пустая заглушка, см. TODO там же).
# Если включить schedule сейчас, celery beat каждый день в 03:00 будет пытаться
# отправить задачу с именем, которого нет ни в одном @celery_app.task — воркер
# залогирует "Received unregistered task" и молча ничего не сделает. Раскомментировать
# и одновременно реализовать check_overdue как часть Этапа 7 (см. tasks/billing_check.py).
#
# celery_app.conf.beat_schedule = {
#     "check-overdue-subscriptions": {
#         "task": "app.tasks.billing_check.check_overdue",
#         "schedule": crontab(hour=3, minute=0),  # раз в сутки в 03:00 Asia/Almaty
#     },
# }
