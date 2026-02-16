import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk, Embedding, Project, Source, User
from app.services.retrieval import (
    ContextAssembler,
    KeywordSearch,
    ReciprocalRankFusion,
    SearchResult,
    VectorSearch,
)


@pytest.mark.asyncio
async def test_vector_search_returns_best_match(db: AsyncSession):
    user = User(email=f"vector_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Vector Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="text",
        content_hash="hash1",
        metadata_={"title": "Vector Doc"},
        status="completed",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    chunk1 = Chunk(
        project_id=project.id,
        source_id=source.id,
        text="alpha",
        metadata_={},
    )
    chunk2 = Chunk(
        project_id=project.id,
        source_id=source.id,
        text="beta",
        metadata_={},
    )
    db.add_all([chunk1, chunk2])
    await db.commit()
    await db.refresh(chunk1)
    await db.refresh(chunk2)

    emb1 = [1.0] + [0.0] * 1535
    emb2 = [0.0, 1.0] + [0.0] * 1534
    db.add_all(
        [
            Embedding(
                chunk_id=chunk1.id,
                project_id=project.id,
                embedding=emb1,
            ),
            Embedding(
                chunk_id=chunk2.id,
                project_id=project.id,
                embedding=emb2,
            ),
        ]
    )
    await db.commit()

    searcher = VectorSearch(db)
    results = await searcher.search(emb1, project.id, limit=2)

    assert results
    assert results[0].chunk_id == chunk1.id


@pytest.mark.asyncio
async def test_keyword_search_returns_matches(db: AsyncSession):
    user = User(email=f"keyword_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Keyword Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="text",
        content_hash="hash2",
        metadata_={},
        status="completed",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    chunk = Chunk(
        project_id=project.id,
        source_id=source.id,
        text="banana apple",
        metadata_={},
    )
    db.add(chunk)
    await db.commit()
    await db.refresh(chunk)

    searcher = KeywordSearch(db)
    results = await searcher.search(["banana"], project.id, limit=5)

    assert results
    assert results[0].chunk_id == chunk.id


def test_rrf_fusion_orders_results():
    chunk_id = uuid.uuid4()
    vector_results = [
        SearchResult(
            chunk_id=chunk_id,
            text="alpha",
            metadata={},
            source_id=uuid.uuid4(),
            source_metadata={},
            vector_score=0.9,
            rank=1,
        )
    ]
    keyword_results = [
        SearchResult(
            chunk_id=chunk_id,
            text="alpha",
            metadata={},
            source_id=uuid.uuid4(),
            source_metadata={},
            keyword_score=0.8,
            rank=1,
        )
    ]

    fused = ReciprocalRankFusion().fuse(vector_results, keyword_results)
    assert fused
    assert fused[0].chunk_id == chunk_id
    assert fused[0].rrf_score > 0


def test_context_assembler_respects_budget():
    results = [
        SearchResult(
            chunk_id=uuid.uuid4(),
            text="alpha beta",
            metadata={"token_count": 2},
            source_id=uuid.uuid4(),
            source_metadata={},
            vector_score=0.5,
            rank=1,
        )
    ]
    fused = ReciprocalRankFusion().fuse(results, [])
    assembler = ContextAssembler(context_window=10)
    assembled = assembler.assemble("question", fused, max_chunks=1)

    assert assembled.selected_chunks
    assert "Documents:" in assembled.full_text
