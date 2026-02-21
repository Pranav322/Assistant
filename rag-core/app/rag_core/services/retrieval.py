from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from typing import Any, Iterable, Sequence, cast

import tiktoken
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Chunk, Embedding, Source
from app.rag_core.services.embedding import EmbeddingService
from app.rag_core.services.embedding_cache import EmbeddingCache


@dataclass
class SearchResult:
    chunk_id: uuid.UUID
    text: str
    metadata: dict[str, Any]
    source_id: uuid.UUID
    source_metadata: dict[str, Any]
    vector_score: float | None = None
    keyword_score: float | None = None


@dataclass
class FusedResult:
    chunk_id: uuid.UUID
    text: str
    metadata: dict[str, Any]
    source_id: uuid.UUID
    source_metadata: dict[str, Any]
    rrf_score: float


@dataclass
class AssembledContext:
    full_text: str
    selected_chunks: list[FusedResult]
    total_tokens: int


@dataclass
class RetrievalOutput:
    context: AssembledContext
    citations: list[dict[str, Any]]
    results: Sequence[FusedResult]
    cache_hit_rate: float


class VectorSearch:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self, embedding: list[float], project_id: uuid.UUID, limit: int = 50
    ) -> list[SearchResult]:
        distance = Embedding.embedding.cosine_distance(embedding)
        stmt = (
            select(
                Chunk.id,
                Chunk.text,
                Chunk.metadata_,
                Source.id.label("source_id"),
                Source.metadata_.label("source_metadata"),
                (1 - distance).label("similarity_score"),
            )
            .join(Embedding, Embedding.chunk_id == Chunk.id)
            .join(Source, Source.id == Chunk.source_id)
            .where(Chunk.project_id == project_id)
            .order_by(distance)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            SearchResult(
                chunk_id=row.id,
                text=row.text,
                metadata=row.metadata_,
                source_id=row.source_id,
                source_metadata=row.source_metadata,
                vector_score=float(row.similarity_score),
            )
            for row in rows
        ]


class KeywordSearch:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self, terms: Iterable[str], project_id: uuid.UUID, limit: int = 50
    ) -> list[SearchResult]:
        cleaned_terms = []
        for term in terms:
            cleaned = re.sub(r"[^\w\s]", "", term).strip().lower()
            if len(cleaned) >= 2:
                cleaned_terms.append(f"{cleaned}:*")
        if not cleaned_terms:
            return []

        tsquery = " & ".join(cleaned_terms)
        tsquery_expr = func.to_tsquery("english", tsquery)
        stmt = (
            select(
                Chunk.id,
                Chunk.text,
                Chunk.metadata_,
                Source.id.label("source_id"),
                Source.metadata_.label("source_metadata"),
                func.ts_rank(Chunk.search_tsvector, tsquery_expr).label(
                    "keyword_score"
                ),
            )
            .join(Source, Source.id == Chunk.source_id)
            .where(
                Chunk.project_id == project_id,
                Chunk.search_tsvector.op("@@")(tsquery_expr),
            )
            .order_by(desc("keyword_score"))
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            SearchResult(
                chunk_id=row.id,
                text=row.text,
                metadata=row.metadata_,
                source_id=row.source_id,
                source_metadata=row.source_metadata,
                keyword_score=float(row.keyword_score or 0.0),
            )
            for row in rows
        ]


def _fuse(
    vector_results: list[SearchResult], keyword_results: list[SearchResult], k: int = 60
) -> list[FusedResult]:
    scores: dict[uuid.UUID, dict[str, Any]] = {}
    for idx, item in enumerate(vector_results, start=1):
        scores.setdefault(item.chunk_id, {"item": item, "v": None, "k": None})["v"] = (
            idx
        )
    for idx, item in enumerate(keyword_results, start=1):
        scores.setdefault(item.chunk_id, {"item": item, "v": None, "k": None})["k"] = (
            idx
        )

    fused = []
    for chunk_id, data in scores.items():
        score = 0.0
        if data["v"]:
            score += 1.0 / (k + data["v"])
        if data["k"]:
            score += 1.0 / (k + data["k"])
        item = cast(SearchResult, data["item"])
        fused.append(
            FusedResult(
                chunk_id=chunk_id,
                text=item.text,
                metadata=item.metadata,
                source_id=item.source_id,
                source_metadata=item.source_metadata,
                rrf_score=score,
            )
        )
    fused.sort(key=lambda x: x.rrf_score, reverse=True)
    return fused


def _citations(chunks: list[FusedResult]) -> list[dict[str, Any]]:
    out = []
    for idx, chunk in enumerate(chunks, start=1):
        out.append(
            {
                "id": idx,
                "chunk_id": str(chunk.chunk_id),
                "source_id": str(chunk.source_id),
                "title": chunk.source_metadata.get("title", "Document"),
                "page": chunk.metadata.get("page_number"),
                "section": chunk.metadata.get("section_title"),
                "confidence": chunk.rrf_score,
                "text_preview": chunk.text[:200] + "..."
                if len(chunk.text) > 200
                else chunk.text,
            }
        )
    return out


class RetrievalPipeline:
    def __init__(self, db: AsyncSession, redis_client: Any | None = None):
        self.db = db
        self.redis = redis_client
        self.embedder = EmbeddingService()
        self.vector_search = VectorSearch(db)
        self.keyword_search = KeywordSearch(db)
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    async def retrieve(
        self,
        project_id: uuid.UUID,
        query: str,
        conversation_history: list[dict[str, str]] | None = None,
        query_id: uuid.UUID | None = None,
    ) -> RetrievalOutput:
        del query_id
        terms = [w for w in query.lower().split() if len(w) > 2]
        queries = [query]
        if conversation_history:
            last_user = next(
                (m for m in reversed(conversation_history) if m.get("role") == "user"),
                None,
            )
            if last_user and last_user.get("content") and last_user["content"] != query:
                queries.append(last_user["content"] + " " + query)

        config = {
            "model": "text-embedding-3-small",
            "provider": "azure",
            "dimension": 1536,
        }
        cache = EmbeddingCache(
            self.db, project_id, redis_client=self.redis, ttl_days=30
        )
        cache_result = await cache.get_embeddings(queries, config)
        cached = cache_result.embeddings

        missing = [text for text, emb in zip(queries, cached) if emb is None]
        if missing:
            new_emb = await self.embedder.get_embeddings(missing)
            await cache.set_embeddings(missing, new_emb, config)
            it = iter(new_emb)
            cached = [e if e is not None else next(it) for e in cached]

        primary_embedding = cast(list[float], cached[0])
        vector_results = await self.vector_search.search(
            primary_embedding, project_id, limit=50
        )
        keyword_results = await self.keyword_search.search(terms, project_id, limit=50)
        fused = _fuse(vector_results, keyword_results)[:10]

        docs = []
        for idx, chunk in enumerate(fused, start=1):
            title = chunk.source_metadata.get("title") or "Document"
            docs.append(f"[Document {idx}: {title}]\n{chunk.text}")
        full_text = f"Documents:\n{'\n\n'.join(docs)}\n\nQuestion: {query}"

        context = AssembledContext(
            full_text=full_text,
            selected_chunks=fused,
            total_tokens=len(self.tokenizer.encode(full_text)),
        )
        return RetrievalOutput(
            context=context,
            citations=_citations(fused),
            results=fused,
            cache_hit_rate=cache_result.hit_rate,
        )
