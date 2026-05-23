import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, User
from app.services.embedding_cache import CacheResult, EmbeddingCache
from app.services.retrieval import (
    AssembledContext,
    FusedResult,
    QueryProcessor,
    Reranker,
    RetrievalPipeline,
)


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


@pytest.mark.asyncio
async def test_retrieve_uses_provided_config_without_reloading_project(
    db: AsyncSession,
):
    user = User(email=f"retrieve_cfg_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Retrieve Config Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    pipeline = RetrievalPipeline(db)
    config = pipeline.build_config(project)

    pipeline._load_retrieval_config = AsyncMock(
        side_effect=AssertionError("Should not reload")
    )
    pipeline._timed_multi_vector_search = AsyncMock(return_value=([], 0.001))
    pipeline._timed_keyword_search = AsyncMock(return_value=([], 0.001))
    pipeline.rrf.fuse = MagicMock(return_value=[])
    pipeline.context_assembler.assemble = MagicMock(
        return_value=AssembledContext(
            full_text="Documents:\n\nQuestion: q",
            selected_chunks=[],
            total_tokens=0,
            chunk_tokens=0,
        )
    )

    with patch(
        "app.services.retrieval.EmbeddingCache.get_embeddings",
        new=AsyncMock(return_value=CacheResult(embeddings=[[0.1, 0.2]], hit_rate=1.0)),
    ):
        output = await pipeline.retrieve(
            project.id,
            "q",
            retrieval_config=config,
        )

    assert output.context.full_text.endswith("Question: q")
    pipeline._load_retrieval_config.assert_not_called()
