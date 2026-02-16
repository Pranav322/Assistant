import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, User
from app.services.embedding_cache import EmbeddingCache
from app.services.retrieval import FusedResult, QueryProcessor, Reranker


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self.store.get(key) for key in keys]

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.store[key] = value


@pytest.mark.asyncio
async def test_embedding_cache_roundtrip(db: AsyncSession):
    user = User(email=f"cache_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Cache Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    cache = EmbeddingCache(db, project.id, redis_client=FakeRedis(), ttl_days=1)
    config = {"model": "text-embedding-3-small", "provider": "azure"}

    await cache.set_embeddings(["hello"], [[0.1, 0.2]], config)
    result = await cache.get_embeddings(["hello"], config)

    assert result.embeddings[0] == [0.1, 0.2]
    assert result.hit_rate == 1.0


def test_query_expansion_uses_history():
    processor = QueryProcessor()
    expansions, terms = processor.process_query(
        "current",
        history=[{"role": "user", "content": "previous"}],
        max_expansions=3,
    )
    assert any("previous" in expansion for expansion in expansions)
    assert "current" in terms


@pytest.mark.asyncio
async def test_reranker_disabled_returns_rrf():
    reranker = Reranker("BAAI/bge-reranker-base", enabled=False)
    fused = [
        FusedResult(
            chunk_id=uuid.uuid4(),
            text="alpha",
            metadata={},
            source_id=uuid.uuid4(),
            source_metadata={},
            vector_score=0.9,
            keyword_score=0.0,
            rrf_score=0.5,
            vector_rank=1,
            keyword_rank=None,
        )
    ]

    reranked = await reranker.rerank("query", fused, top_k=1, weight=0.3)
    assert reranked[0].final_score == fused[0].rrf_score
