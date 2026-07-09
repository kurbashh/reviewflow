"""
app/core/redis.py

Асинхронный клиент Redis для FastAPI.
"""
from typing import Optional
from redis.asyncio import Redis
from app.config import settings

redis_client: Optional[Redis] = None

async def init_redis():
    global redis_client
    redis_client = Redis.from_url(str(settings.redis_url), decode_responses=True)

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()

def get_redis() -> Redis:
    if redis_client is None:
        raise RuntimeError("Redis client is not initialized")
    return redis_client
