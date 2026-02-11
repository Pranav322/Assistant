from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Any, Iterable
import uuid
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CacheEntry


@dataclass
class CacheResult:
    embeddings: list[list[float] | None]
    hit_rate: float


class EmbeddingCache:
    def __init__(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        redis_client: Any | None = None,
        ttl_days: int = 30,
    ) -> None:
        self.db = db
        self.project_id = project_id
        self.redis = redis_client
        self.ttl_days = ttl_days

    async def get_embeddings(
        self, texts: Iterable[str], config: dict[str, Any]
    ) -> CacheResult:
        text_list = list(texts)
        results: list[list[float] | None] = [None] * len(text_list)
        if not text_list:
            return CacheResult(results, 0.0)

        config_hash = self._config_hash(config)
        keys = [self._cache_key(text, config_hash) for text in text_list]
        redis_keys = [self._redis_key(key) for key in keys]

        if self.redis:
            cached = await self.redis.mget(redis_keys)
            for idx, raw in enumerate(cached):
                if raw:
                    payload = json.loads(raw)
                    results[idx] = payload.get("embedding")

        missing_indices = [idx for idx, value in enumerate(results) if value is None]
        if missing_indices:
            now = datetime.now(timezone.utc)
            missing_keys = [keys[idx] for idx in missing_indices]
            rows = (
                await self.db.execute(
                    select(CacheEntry).where(
                        CacheEntry.project_id == self.project_id,
                        CacheEntry.cache_type == "embedding",
                        CacheEntry.cache_key.in_(missing_keys),
                        CacheEntry.expires_at > now,
                    )
                )
            ).scalars()

            db_map = {row.cache_key: (row.data or {}).get("embedding") for row in rows}
            for idx in missing_indices:
                embedding = db_map.get(keys[idx])
                if embedding is not None:
                    results[idx] = embedding
                    if self.redis:
                        await self.redis.setex(
                            redis_keys[idx], 3600, json.dumps({"embedding": embedding})
                        )

        hits = sum(1 for value in results if value is not None)
        hit_rate = hits / len(results) if results else 0.0
        return CacheResult(results, hit_rate)

    async def set_embeddings(
        self,
        texts: Iterable[str],
        embeddings: Iterable[list[float]],
        config: dict[str, Any],
    ) -> None:
        text_list = list(texts)
        embedding_list = list(embeddings)
        if not text_list:
            return

        config_hash = self._config_hash(config)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=self.ttl_days)

        rows = []
        for text, embedding in zip(text_list, embedding_list):
            cache_key = self._cache_key(text, config_hash)
            payload = {"embedding": embedding}
            size_bytes = len(json.dumps(payload))
            rows.append(
                {
                    "project_id": self.project_id,
                    "cache_key": cache_key,
                    "cache_type": "embedding",
                    "data": payload,
                    "size_bytes": size_bytes,
                    "expires_at": expires_at,
                    "last_accessed_at": func.now(),
                }
            )
            if self.redis:
                await self.redis.setex(
                    self._redis_key(cache_key), 3600, json.dumps(payload)
                )

        insert_stmt = pg_insert(CacheEntry).values(rows)
        upsert = insert_stmt.on_conflict_do_update(
            index_elements=["project_id", "cache_key", "cache_type"],
            set_={
                "data": insert_stmt.excluded.data,
                "size_bytes": insert_stmt.excluded.size_bytes,
                "expires_at": insert_stmt.excluded.expires_at,
                "last_accessed_at": func.now(),
            },
        )
        await self.db.execute(upsert)

    def _config_hash(self, config: dict[str, Any]) -> str:
        raw = json.dumps(config, sort_keys=True).encode()
        return hashlib.md5(raw).hexdigest()[:8]

    def _cache_key(self, text: str, config_hash: str) -> str:
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        return f"{config_hash}:{text_hash}"

    def _redis_key(self, cache_key: str) -> str:
        return f"embed:{cache_key}"
