import pytest
from app.core.security import (
    generate_api_key,
    hash_api_key,
    verify_api_key,
    validate_origin,
)
from app.services.rate_limit import RateLimiter
from app.core.config import settings


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.store[key] = self.store.get(key, 0) + 1
        return self.store[key]

    async def expire(self, key: str, _seconds: int) -> None:
        return None


def test_api_key_hash_roundtrip() -> None:
    api_key = generate_api_key()
    hashed = hash_api_key(api_key)
    assert verify_api_key(api_key, hashed) is True


def test_validate_origin_matches() -> None:
    assert validate_origin("https://example.com", ["https://example.com"]) is True
    assert validate_origin("https://sub.example.com", ["https://*.example.com"]) is True
    assert validate_origin("https://evil.com", ["https://example.com"]) is False


@pytest.mark.asyncio
async def test_rate_limiter_blocks_after_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_IP_PER_MINUTE", 1)
    monkeypatch.setattr(settings, "RATE_LIMIT_INGEST_PER_MINUTE", 1)
    limiter = RateLimiter(FakeRedis())

    allowed_first = await limiter.check(
        ip="1.2.3.4",
        api_key_prefix="chat_abcdef",
        endpoint="ingestion",
        project_id="project-1",
    )
    allowed_second = await limiter.check(
        ip="1.2.3.4",
        api_key_prefix="chat_abcdef",
        endpoint="ingestion",
        project_id="project-1",
    )

    assert allowed_first is True
    assert allowed_second is False
