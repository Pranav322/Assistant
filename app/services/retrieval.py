from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable
import re
import uuid
import tiktoken
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Chunk, Embedding, Source


@dataclass
class SearchResult:
    chunk_id: uuid.UUID
    text: str
    metadata: dict[str, Any]
    source_id: uuid.UUID
    source_metadata: dict[str, Any]
    vector_score: float | None = None
    keyword_score: float | None = None
    rank: int | None = None


@dataclass
class FusedResult:
    chunk_id: uuid.UUID
    text: str
    metadata: dict[str, Any]
    source_id: uuid.UUID
    source_metadata: dict[str, Any]
    vector_score: float
    keyword_score: float
    rrf_score: float
    vector_rank: int | None
    keyword_rank: int | None


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
        results: list[SearchResult] = []
        for idx, row in enumerate(rows, start=1):
            results.append(
                SearchResult(
                    chunk_id=row.id,
                    text=row.text,
                    metadata=row.metadata_,
                    source_id=row.source_id,
                    source_metadata=row.source_metadata,
                    vector_score=float(row.similarity_score),
                    rank=idx,
                )
            )
        return results


class KeywordSearch:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self, terms: Iterable[str], project_id: uuid.UUID, limit: int = 50
    ) -> list[SearchResult]:
        tsquery_terms = self._build_terms(terms)
        if not tsquery_terms:
            return []

        tsquery = " & ".join(tsquery_terms)
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
        results: list[SearchResult] = []
        for idx, row in enumerate(rows, start=1):
            results.append(
                SearchResult(
                    chunk_id=row.id,
                    text=row.text,
                    metadata=row.metadata_,
                    source_id=row.source_id,
                    source_metadata=row.source_metadata,
                    keyword_score=float(row.keyword_score or 0.0),
                    rank=idx,
                )
            )
        return results

    def _build_terms(self, terms: Iterable[str]) -> list[str]:
        tsquery_terms: list[str] = []
        for term in terms:
            cleaned = re.sub(r"[^\w\s]", "", term).strip().lower()
            if len(cleaned) >= 2:
                tsquery_terms.append(f"{cleaned}:*")
        return tsquery_terms


class ReciprocalRankFusion:
    def __init__(self, k: int = 60):
        self.k = k

    def fuse(
        self,
        vector_results: list[SearchResult],
        keyword_results: list[SearchResult],
        weights: dict[str, float] | None = None,
    ) -> list[FusedResult]:
        weights = weights or {"vector": 1.0, "keyword": 1.0}
        scores: dict[uuid.UUID, dict[str, Any]] = {}

        for idx, result in enumerate(vector_results, start=1):
            entry = scores.setdefault(result.chunk_id, {})
            entry["vector_rank"] = idx
            entry["vector_score"] = result.vector_score or 0.0
            entry.setdefault("keyword_rank", None)
            entry.setdefault("keyword_score", 0.0)
            entry["result"] = result

        for idx, result in enumerate(keyword_results, start=1):
            entry = scores.setdefault(result.chunk_id, {})
            entry["keyword_rank"] = idx
            entry["keyword_score"] = result.keyword_score or 0.0
            entry.setdefault("vector_rank", None)
            entry.setdefault("vector_score", 0.0)
            entry.setdefault("result", result)

        fused: list[FusedResult] = []
        for chunk_id, data in scores.items():
            rrf_score = 0.0
            if data.get("vector_rank"):
                rrf_score += weights["vector"] * (1.0 / (self.k + data["vector_rank"]))
            if data.get("keyword_rank"):
                rrf_score += weights["keyword"] * (
                    1.0 / (self.k + data["keyword_rank"])
                )

            result = data["result"]
            fused.append(
                FusedResult(
                    chunk_id=chunk_id,
                    text=result.text,
                    metadata=result.metadata,
                    source_id=result.source_id,
                    source_metadata=result.source_metadata,
                    vector_score=float(data.get("vector_score", 0.0)),
                    keyword_score=float(data.get("keyword_score", 0.0)),
                    rrf_score=rrf_score,
                    vector_rank=data.get("vector_rank"),
                    keyword_rank=data.get("keyword_rank"),
                )
            )

        fused.sort(key=lambda item: item.rrf_score, reverse=True)
        return fused


@dataclass
class AssembledContext:
    full_text: str
    selected_chunks: list[FusedResult]
    total_tokens: int
    chunk_tokens: int


class ContextAssembler:
    def __init__(self, context_window: int = 128000):
        self.context_window = context_window
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def assemble(
        self,
        query: str,
        results: list[FusedResult],
        max_chunks: int = 10,
    ) -> AssembledContext:
        selected: list[FusedResult] = []
        used_tokens = 0
        for result in results:
            if len(selected) >= max_chunks:
                break
            chunk_tokens = self._chunk_token_count(result)
            if used_tokens + chunk_tokens > self.context_window:
                break
            selected.append(result)
            used_tokens += chunk_tokens

        docs_text = self._format_documents(selected)
        full_text = f"Documents:\n{docs_text}\n\nQuestion: {query}"
        total_tokens = len(self.tokenizer.encode(full_text))
        return AssembledContext(
            full_text=full_text,
            selected_chunks=selected,
            total_tokens=total_tokens,
            chunk_tokens=used_tokens,
        )

    def _format_documents(self, chunks: list[FusedResult]) -> str:
        formatted = []
        for idx, chunk in enumerate(chunks, start=1):
            title = chunk.source_metadata.get("title") or "Document"
            section = chunk.metadata.get("section_title")
            header = f"[Document {idx}: {title}]"
            if section:
                header = f"{header} - {section}"
            formatted.append(f"{header}\n{chunk.text}")
        return "\n\n".join(formatted)

    def _chunk_token_count(self, result: FusedResult) -> int:
        token_count = result.metadata.get("token_count")
        if isinstance(token_count, int):
            return token_count
        return len(self.tokenizer.encode(result.text))


def generate_citations(chunks: list[FusedResult]) -> list[dict[str, Any]]:
    citations = []
    for idx, chunk in enumerate(chunks, start=1):
        source_meta = chunk.source_metadata or {}
        chunk_meta = chunk.metadata or {}
        citation = {
            "id": idx,
            "chunk_id": str(chunk.chunk_id),
            "source_id": str(chunk.source_id),
            "title": source_meta.get("title", "Document"),
            "page": chunk_meta.get("page_number"),
            "section": chunk_meta.get("section_title"),
            "confidence": chunk.rrf_score,
            "text_preview": chunk.text[:200] + "..."
            if len(chunk.text) > 200
            else chunk.text,
        }
        citations.append(citation)
    return citations
