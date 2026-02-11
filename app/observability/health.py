from __future__ import annotations

import asyncio
from sqlalchemy import text
import redis.asyncio as redis
from app.api.deps import AsyncSessionLocal
from app.core.config import settings
from app.services.storage import StorageService


async def check_db() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_redis() -> bool:
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        await client.aclose()
        return True
    except Exception:
        return False


async def check_s3() -> bool:
    if not all(
        [settings.S3_ENDPOINT, settings.S3_ACCESS_KEY_ID, settings.S3_SECRET_ACCESS_KEY]
    ):
        return False
    storage = StorageService()
    return await storage.health_check()


async def readiness() -> dict[str, bool]:
    db_ok, redis_ok, s3_ok = await asyncio.gather(check_db(), check_redis(), check_s3())
    return {"db": db_ok, "redis": redis_ok, "s3": s3_ok}
