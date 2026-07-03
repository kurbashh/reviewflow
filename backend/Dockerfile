# Dockerfile
#
# Единый образ используется для трёх сервисов в docker-compose.yml
# (api / worker / beat) — различаются только командой запуска (CMD
# переопределяется в docker-compose через `command:`).
#
# Multi-stage: builder ставит зависимости в изолированный venv,
# runtime-стадия копирует только venv + код — без gcc/build-essential
# и кэша pip в финальном образе.

# --------------------------------------------------------------------------
# Stage 1: builder
# --------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# libpq-dev нужен для сборки psycopg (даже с [binary] extra иногда тянет
# заголовки на некоторых платформах) — держим в builder-стадии, не в runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# --------------------------------------------------------------------------
# Stage 2: runtime
# --------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

# libpq5 — только рантайм-библиотека для psycopg, без dev-заголовков
# Директория под celerybeat-schedule (см. docker-compose.yml: volume celery_beat_data).
# Создаём и назначаем владельца ЗДЕСЬ, до переключения на USER reviewflow —
# иначе именованный volume при первом маунте унаследует владельца root,
# и beat-контейнер упадёт с Permission denied при попытке записать schedule.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 reviewflow \
    && useradd --uid 1000 --gid reviewflow --shell /bin/bash --create-home reviewflow \
    && mkdir -p /var/lib/celery \
    && chown reviewflow:reviewflow /var/lib/celery

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app
COPY --chown=reviewflow:reviewflow . .

USER reviewflow

# Порт документирует намерение (api-сервис), worker/beat его не используют —
# реальный биндинг порта задаётся командой в docker-compose.yml
EXPOSE 8000

# Дефолтная команда — api. worker/beat переопределяют через `command:` в compose.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]