from typing import Any
from app.core.config import settings


class RateLimiter:
    def __init__(self, redis_client: Any):
        self.redis = redis_client

    async def check(
        self,
        ip: str,
        api_key_prefix: str | None,
        endpoint: str,
        project_id: str,
        user_id: str | None = None,
        api_key_rate_limit: dict | None = None,
    ) -> bool:
        if not await self._check_limit(
            key=f"ratelimit:ip:{ip}",
            limit=settings.RATE_LIMIT_IP_PER_MINUTE,
            window_seconds=60,
        ):
            return False

        if api_key_prefix:
            requests_per_minute = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
            if api_key_rate_limit:
                requests_per_minute = int(
                    api_key_rate_limit.get("requests_per_minute", requests_per_minute)
                )
            if not await self._check_limit(
                key=f"ratelimit:apikey:{api_key_prefix}",
                limit=requests_per_minute,
                window_seconds=60,
            ):
                return False

        if user_id:
            user_limit = settings.USER_RATE_LIMIT_PER_MINUTE
            if endpoint == "chat":
                user_limit = settings.USER_CHAT_RATE_LIMIT_PER_MINUTE
            if not await self._check_limit(
                key=f"ratelimit:user:{endpoint}:{user_id}",
                limit=user_limit,
                window_seconds=60,
            ):
                return False

        endpoint_limit = self._endpoint_limit(endpoint)
        if endpoint_limit:
            if not await self._check_limit(
                key=f"ratelimit:endpoint:{endpoint}:{project_id}",
                limit=endpoint_limit,
                window_seconds=60,
            ):
                return False

        return True

    async def _check_limit(self, key: str, limit: int, window_seconds: int) -> bool:
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, window_seconds)
        return current <= limit

    def _endpoint_limit(self, endpoint: str) -> int | None:
        if endpoint == "chat":
            return settings.RATE_LIMIT_CHAT_PER_MINUTE
        if endpoint == "ingestion":
            return settings.RATE_LIMIT_INGEST_PER_MINUTE
        if endpoint == "token_refresh":
            return settings.RATE_LIMIT_TOKEN_REFRESH_PER_MINUTE
        return None
