import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import dramatiq
from dramatiq.brokers.stub import StubBroker
from dramatiq.middleware import AgeLimit, TimeLimit, Callbacks, Pipelines, Retries
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# 1. Setup Dramatiq StubBroker before app imports
broker = StubBroker()
broker.add_middleware(Retries())
dramatiq.set_broker(broker)

# 2. Patch RedisBroker to prevent connection attempts during app import
# Crucially, make it return our configured StubBroker so app.worker uses it
with patch("dramatiq.brokers.redis.RedisBroker") as MockRedisBroker:
    MockRedisBroker.return_value = broker

    from app.api.deps import get_db, get_redis
    from app.core.config import settings
    from app.main import app
    from app.models import Base


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.subscribers: dict[str, list[asyncio.Queue[dict[str, str]]]] = {}

    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self.store.get(key) for key in keys]

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.store[key] = value

    async def incr(self, key: str) -> int:
        current = int(self.store.get(key, "0")) + 1
        self.store[key] = str(current)
        return current

    async def expire(self, _key: str, _ttl: int) -> None:
        return None

    async def publish(self, channel: str, message: str) -> int:
        payload = {
            "type": "message",
            "channel": channel,
            "data": message,
        }
        subscribers = self.subscribers.get(channel, [])
        for queue in subscribers:
            await queue.put(payload)
        return len(subscribers)

    def pubsub(self) -> "FakePubSub":
        return FakePubSub(self)

    async def close(self) -> None:
        return None

    async def aclose(self) -> None:
        return None


class FakePubSub:
    def __init__(self, redis_client: FakeRedis) -> None:
        self.redis_client = redis_client
        self.queues: dict[str, asyncio.Queue[dict[str, str]]] = {}

    async def subscribe(self, *channels: str) -> None:
        for channel in channels:
            if channel in self.queues:
                continue
            queue: asyncio.Queue[dict[str, str]] = asyncio.Queue()
            self.queues[channel] = queue
            self.redis_client.subscribers.setdefault(channel, []).append(queue)

    async def unsubscribe(self, *channels: str) -> None:
        target_channels = channels or tuple(self.queues.keys())
        for channel in target_channels:
            queue = self.queues.pop(channel, None)
            if queue is None:
                continue
            subscribers = self.redis_client.subscribers.get(channel, [])
            if queue in subscribers:
                subscribers.remove(queue)
            if not subscribers:
                self.redis_client.subscribers.pop(channel, None)

    async def get_message(
        self,
        ignore_subscribe_messages: bool = True,
        timeout: float = 0.0,
    ) -> dict[str, str] | None:
        del ignore_subscribe_messages  # kept for compatibility with redis-py API
        if not self.queues:
            if timeout > 0:
                await asyncio.sleep(timeout)
            return None

        deadline = asyncio.get_running_loop().time() + max(timeout, 0.0)
        while True:
            for queue in self.queues.values():
                if queue.empty():
                    continue
                return queue.get_nowait()
            if timeout <= 0:
                return None
            if asyncio.get_running_loop().time() >= deadline:
                return None
            await asyncio.sleep(0.01)

    async def close(self) -> None:
        await self.unsubscribe()

    async def aclose(self) -> None:
        await self.unsubscribe()


@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
        if session.is_active:
            await session.rollback()
    await engine.dispose()


@pytest.fixture
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_redis] = lambda: FakeRedis()

    # Mock StorageService globally for all tests using this client
    with patch("app.services.storage.StorageService") as MockStorage:
        mock_instance = MockStorage.return_value
        mock_instance.upload_file = AsyncMock(return_value="mock/path/to/file")
        mock_instance.get_file = AsyncMock(return_value=b"mock content")
        mock_instance.delete_file = AsyncMock(return_value=True)
        # Also mock S3 healthcheck
        mock_instance.health_check = AsyncMock(return_value=True)

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as c:
            yield c

    app.dependency_overrides.clear()
