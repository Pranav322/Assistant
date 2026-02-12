from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Sequence, cast
import asyncio
import importlib
import time
import re
import uuid
import tiktoken
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
from app.models import Chunk, Embedding, Source, Project, RetrievalMetric
from app.services.embedding import EmbeddingService
from app.services.embedding_cache import EmbeddingCache

logger = structlog.get_logger()


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


@dataclass
class RerankedResult:
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
    reranker_score: float
    final_score: float


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
    selected_chunks: list[FusedResult | RerankedResult]
    total_tokens: int
    chunk_tokens: int


class ContextAssembler:
    def __init__(self, context_window: int = 128000):
        self.context_window = context_window
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def assemble(
        self,
        query: str,
        results: Sequence[FusedResult | RerankedResult],
        max_chunks: int = 10,
    ) -> AssembledContext:
        selected: list[FusedResult | RerankedResult] = []
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

    def _format_documents(self, chunks: Sequence[FusedResult | RerankedResult]) -> str:
        formatted = []
        for idx, chunk in enumerate(chunks, start=1):
            title = chunk.source_metadata.get("title") or "Document"
            section = chunk.metadata.get("section_title")
            header = f"[Document {idx}: {title}]"
            if section:
                header = f"{header} - {section}"
            formatted.append(f"{header}\n{chunk.text}")
        return "\n\n".join(formatted)

    def _chunk_token_count(self, result: FusedResult | RerankedResult) -> int:
        token_count = result.metadata.get("token_count")
        if isinstance(token_count, int):
            return token_count
        return len(self.tokenizer.encode(result.text))


def generate_citations(
    chunks: list[FusedResult | RerankedResult],
) -> list[dict[str, Any]]:
    citations = []
    for idx, chunk in enumerate(chunks, start=1):
        source_meta = chunk.source_metadata or {}
        chunk_meta = chunk.metadata or {}
        confidence = (
            chunk.final_score if isinstance(chunk, RerankedResult) else chunk.rrf_score
        )
        citation = {
            "id": idx,
            "chunk_id": str(chunk.chunk_id),
            "source_id": str(chunk.source_id),
            "title": source_meta.get("title", "Document"),
            "page": chunk_meta.get("page_number"),
            "section": chunk_meta.get("section_title"),
            "confidence": confidence,
            "text_preview": (
                chunk.text[:200] + "..." if len(chunk.text) > 200 else chunk.text
            ),
        }
        citations.append(citation)
    return citations


@dataclass
class QueryEmbedding:
    query: str
    embedding: list[float]
    weight: float


@dataclass
class ProcessedQuery:
    original: str
    key_terms: list[str]
    embeddings: list[QueryEmbedding]
    expanded_queries: list[str]
    token_count: int


class QueryProcessor:
    def __init__(self) -> None:
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.stop_words = {
            "what",
            "how",
            "why",
            "the",
            "a",
            "an",
            "is",
            "are",
            "can",
            "do",
        }

    def process_query(
        self,
        query: str,
        history: list[dict[str, str]] | None,
        max_expansions: int,
    ) -> tuple[list[str], list[str]]:
        cleaned = query.strip()
        expansions: list[str] = []
        if history:
            last_user = next(
                (item for item in reversed(history) if item.get("role") == "user"),
                None,
            )
            if last_user and last_user.get("content"):
                last_content = last_user["content"].strip()
                if last_content and last_content != cleaned:
                    expansions.append(f"{last_content} {cleaned}")

        rephrasings = [
            cleaned + " in detail",
            "Explain " + cleaned,
            "Information about " + cleaned,
        ]
        expansions.extend(rephrasings)
        unique = []
        seen = set([cleaned])
        for exp in expansions:
            if exp not in seen:
                seen.add(exp)
                unique.append(exp)
        return unique[:max_expansions], self._extract_key_terms(cleaned)

    def _extract_key_terms(self, query: str) -> list[str]:
        words = [word.strip().lower() for word in query.split()]
        filtered = [
            word for word in words if word not in self.stop_words and len(word) > 2
        ]
        return filtered[:10]

    def token_count(self, query: str) -> int:
        return len(self.tokenizer.encode(query))


class Reranker:
    def __init__(self, model_name: str, enabled: bool = True):
        self.model_name = model_name
        self.enabled = enabled
        self._model = None
        self._tokenizer = None
        self._device = None

    async def rerank(
        self,
        query: str,
        candidates: list[FusedResult],
        top_k: int,
        weight: float,
    ) -> list[RerankedResult]:
        if not candidates:
            return []
        if not self.enabled:
            return [self._fallback(candidate) for candidate in candidates[:top_k]]

        available = await self._load_model()
        if not available:
            return [self._fallback(candidate) for candidate in candidates[:top_k]]

        reranker_scores = await asyncio.to_thread(
            self._score_pairs, query, candidates[:top_k]
        )
        reranked: list[RerankedResult] = []
        for candidate, score in zip(candidates[:top_k], reranker_scores):
            final_score = (1 - weight) * candidate.rrf_score + weight * score
            reranked.append(
                RerankedResult(
                    chunk_id=candidate.chunk_id,
                    text=candidate.text,
                    metadata=candidate.metadata,
                    source_id=candidate.source_id,
                    source_metadata=candidate.source_metadata,
                    vector_score=candidate.vector_score,
                    keyword_score=candidate.keyword_score,
                    rrf_score=candidate.rrf_score,
                    vector_rank=candidate.vector_rank,
                    keyword_rank=candidate.keyword_rank,
                    reranker_score=score,
                    final_score=final_score,
                )
            )

        reranked.sort(key=lambda item: item.final_score, reverse=True)
        return reranked

    def _fallback(self, candidate: FusedResult) -> RerankedResult:
        return RerankedResult(
            chunk_id=candidate.chunk_id,
            text=candidate.text,
            metadata=candidate.metadata,
            source_id=candidate.source_id,
            source_metadata=candidate.source_metadata,
            vector_score=candidate.vector_score,
            keyword_score=candidate.keyword_score,
            rrf_score=candidate.rrf_score,
            vector_rank=candidate.vector_rank,
            keyword_rank=candidate.keyword_rank,
            reranker_score=1.0,
            final_score=candidate.rrf_score,
        )

    async def _load_model(self) -> bool:
        if self._model and self._tokenizer:
            return True
        try:
            transformers = importlib.import_module("transformers")
            torch = importlib.import_module("torch")
        except ImportError:
            logger.warning("reranker_unavailable", model=self.model_name)
            return False

        self._tokenizer = transformers.AutoTokenizer.from_pretrained(self.model_name)
        self._model = transformers.AutoModelForSequenceClassification.from_pretrained(
            self.model_name
        )
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model.to(self._device)
        self._model.eval()
        return True

    def _score_pairs(self, query: str, candidates: list[FusedResult]) -> list[float]:
        if not self._model or not self._tokenizer:
            return [1.0 for _ in candidates]

        torch = importlib.import_module("torch")
        pairs = [(query, candidate.text) for candidate in candidates]
        inputs = self._tokenizer(
            pairs,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        ).to(self._device)
        with torch.no_grad():
            scores = self._model(**inputs).logits.squeeze(-1)
        scores_list = scores.cpu().tolist()
        if not scores_list:
            return [1.0 for _ in candidates]
        min_score = min(scores_list)
        max_score = max(scores_list)
        if max_score == min_score:
            return [1.0 for _ in candidates]
        return [(score - min_score) / (max_score - min_score) for score in scores_list]


@dataclass
class RetrievalOutput:
    context: AssembledContext
    citations: list[dict[str, Any]]
    results: Sequence[FusedResult | RerankedResult]
    cache_hit_rate: float


class RetrievalPipeline:
    def __init__(self, db: AsyncSession, redis_client: Any | None = None):
        self.db = db
        self.redis = redis_client
        self.embedder = EmbeddingService()
        self.vector_search = VectorSearch(db)
        self.keyword_search = KeywordSearch(db)
        self.rrf = ReciprocalRankFusion()
        self.query_processor = QueryProcessor()
        self.context_assembler = ContextAssembler()

    async def retrieve(
        self,
        project_id: uuid.UUID,
        query: str,
        conversation_history: list[dict[str, str]] | None = None,
        query_id: uuid.UUID | None = None,
    ) -> RetrievalOutput:
        config = await self._load_retrieval_config(project_id)

        start = time.perf_counter()

        expansions, key_terms = self.query_processor.process_query(
            query,
            conversation_history,
            max_expansions=config["max_query_expansions"],
        )

        queries = [query] + expansions if config["enable_query_expansion"] else [query]

        cache = EmbeddingCache(
            self.db,
            project_id=project_id,
            redis_client=self.redis,
            ttl_days=config["embedding_cache_ttl_days"],
        )
        cache_result = await cache.get_embeddings(queries, config["embedding"])
        cached_embeddings = cache_result.embeddings

        missing_texts = [
            text
            for text, embedding in zip(queries, cached_embeddings)
            if embedding is None
        ]
        if missing_texts:
            new_embeddings = await self.embedder.get_embeddings(missing_texts)
            await cache.set_embeddings(
                missing_texts, new_embeddings, config["embedding"]
            )
            it = iter(new_embeddings)
            cached_embeddings = [
                embedding if embedding is not None else next(it)
                for embedding in cached_embeddings
            ]

        if any(embedding is None for embedding in cached_embeddings):
            raise ValueError("Embedding cache failed to populate")

        query_embeddings = [
            QueryEmbedding(
                query=q,
                embedding=cast(list[float], embedding),
                weight=1.0 if idx == 0 else 0.7,
            )
            for idx, (q, embedding) in enumerate(zip(queries, cached_embeddings))
        ]

        vector_start = time.perf_counter()
        vector_results = await self._multi_vector_search(
            query_embeddings,
            project_id,
            config["max_chunks_to_rerank"],
        )
        vector_time = time.perf_counter() - vector_start

        keyword_start = time.perf_counter()
        keyword_results = await self.keyword_search.search(
            key_terms, project_id, limit=config["max_chunks_to_rerank"]
        )
        keyword_time = time.perf_counter() - keyword_start

        fusion_start = time.perf_counter()
        fused = self.rrf.fuse(
            vector_results,
            keyword_results,
            weights={
                "vector": config["vector_weight"],
                "keyword": config["keyword_weight"],
            },
        )
        fusion_time = time.perf_counter() - fusion_start

        rerank_time = 0.0
        reranker_used = False
        results: Sequence[FusedResult | RerankedResult] = cast(
            Sequence[FusedResult | RerankedResult], fused
        )
        if config["enable_reranking"] and fused:
            rerank_start = time.perf_counter()
            reranker = Reranker(config["reranker_model"], enabled=True)
            reranked = await reranker.rerank(
                query,
                fused,
                top_k=config["max_final_chunks"],
                weight=config["reranker_weight"],
            )
            rerank_time = time.perf_counter() - rerank_start
            results = cast(Sequence[FusedResult | RerankedResult], reranked)
            reranker_used = True

        context = self.context_assembler.assemble(
            query,
            results,
            max_chunks=config["max_final_chunks"],
        )
        citations = generate_citations(context.selected_chunks)

        total_time = time.perf_counter() - start

        await self._record_metrics(
            project_id=project_id,
            query_id=query_id,
            query=query,
            vector_results=vector_results,
            keyword_results=keyword_results,
            final_results=context.selected_chunks,
            cache_hit_rate=cache_result.hit_rate,
            total_time=total_time,
            vector_time=vector_time,
            keyword_time=keyword_time,
            fusion_time=fusion_time,
            rerank_time=rerank_time,
            reranker_used=reranker_used,
        )

        return RetrievalOutput(
            context=context,
            citations=citations,
            results=results,
            cache_hit_rate=cache_result.hit_rate,
        )

    async def _load_retrieval_config(self, project_id: uuid.UUID) -> dict[str, Any]:
        default = {
            "vector_weight": 1.0,
            "keyword_weight": 1.0,
            "rrf_k": 60,
            "enable_reranking": True,
            "reranker_model": "BAAI/bge-reranker-base",
            "reranker_weight": 0.3,
            "max_chunks_to_rerank": 50,
            "max_final_chunks": 10,
            "enable_query_expansion": True,
            "max_query_expansions": 3,
            "embedding_cache_ttl_days": 30,
            "embedding": {
                "model": "text-embedding-3-small",
                "provider": "azure",
                "dimension": 1536,
            },
        }

        result = await self.db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project or not project.settings:
            return default

        retrieval_config = project.settings.get("retrieval") if project.settings else {}
        if retrieval_config:
            for key in default:
                if key in retrieval_config:
                    default[key] = retrieval_config[key]

        chunking_config = project.settings.get("chunking") if project.settings else {}
        if chunking_config:
            default["chunking"] = chunking_config

        return default

    async def _multi_vector_search(
        self,
        embeddings: list[QueryEmbedding],
        project_id: uuid.UUID,
        limit: int,
    ) -> list[SearchResult]:
        scored: dict[uuid.UUID, SearchResult] = {}
        for embedding in embeddings:
            results = await self.vector_search.search(
                embedding.embedding,
                project_id,
                limit=limit,
            )
            for result in results:
                if result.vector_score is None:
                    continue
                weighted_score = result.vector_score * embedding.weight
                existing = scored.get(result.chunk_id)
                if not existing or (existing.vector_score or 0.0) < weighted_score:
                    scored[result.chunk_id] = SearchResult(
                        chunk_id=result.chunk_id,
                        text=result.text,
                        metadata=result.metadata,
                        source_id=result.source_id,
                        source_metadata=result.source_metadata,
                        vector_score=weighted_score,
                    )

        results = list(scored.values())
        results.sort(key=lambda item: item.vector_score or 0.0, reverse=True)
        return results[:limit]

    async def _record_metrics(
        self,
        project_id: uuid.UUID,
        query_id: uuid.UUID | None,
        query: str,
        vector_results: list[SearchResult],
        keyword_results: list[SearchResult],
        final_results: Sequence[FusedResult | RerankedResult],
        cache_hit_rate: float,
        total_time: float,
        vector_time: float,
        keyword_time: float,
        fusion_time: float,
        rerank_time: float,
        reranker_used: bool,
    ) -> None:
        metric = RetrievalMetric(
            project_id=project_id,
            query_id=query_id,
            query_length=len(query.split()),
            retrieval_time_ms=int(total_time * 1000),
            chunks_considered=len(vector_results) + len(keyword_results),
            chunks_returned=len(final_results),
            reranker_used=reranker_used,
            vector_search_time_ms=int(vector_time * 1000),
            keyword_search_time_ms=int(keyword_time * 1000),
            fusion_time_ms=int(fusion_time * 1000),
            rerank_time_ms=int(rerank_time * 1000),
            cache_hit_rate=cache_hit_rate,
            avg_vector_score=self._avg_score(
                [result.vector_score for result in vector_results]
            ),
            avg_keyword_score=self._avg_score(
                [result.keyword_score for result in keyword_results]
            ),
            avg_reranker_score=self._avg_score(
                [getattr(result, "reranker_score", None) for result in final_results]
            ),
        )
        self.db.add(metric)
        await self.db.flush()

    def _avg_score(self, values: list[float | None]) -> float | None:
        filtered = [value for value in values if value is not None]
        if not filtered:
            return None
        return sum(filtered) / len(filtered)
