RETRIEVAL.md — RAG Chatbot Platform
markdown
# RETRIEVAL PIPELINE SPECIFICATION
**Version:** 1.0 (Production Ready)
**Aligned with:** schema.sql v1.0, SECURITY.md v2.1
**Last Updated:** 2026-02-12

---

## **📊 RETRIEVAL PIPELINE OVERVIEW**
[User Query] → [Query Processing] → [Hybrid Search] → [Ranking] → [Context Assembly]
↓ ↓ ↓ ↓ ↓
Query Query Rewriting Vector + Keyword RRF + Reranker Top-k Chunks
Input & Expansion Parallel Search Fusion Output

text

**Pipeline Stages:**
1. **Query Processing** (10-50ms)
2. **Embedding Generation** (50-200ms)
3. **Vector Search** (20-100ms) ← pgvector HNSW index
4. **Keyword Search** (10-50ms) ← Postgres TSVECTOR
5. **Score Fusion** (RRF) (1-5ms)
6. **Reranking** (50-150ms) ← Cross-encoder
7. **Context Assembly** (1-10ms)

**Total Target Latency:** < 500ms (P95)

---

## **1. CHUNKING STRATEGY**

### **1.1 Chunking Pipeline**
[Raw Document] → [Text Extraction] → [Semantic Splitting] → [Token Window] → [Chunk]
↓ ↓ ↓ ↓ ↓
PDF/URL OCR/Scrape Headers/Paragraphs Token Limit Final Chunks

text

### **1.2 Chunk Configuration (Defaults)**
**Storage in database (`chunks` table):**
```sql
-- Default settings (stored in projects.settings)
{
  "chunking": {
    "strategy": "semantic_first",    // "semantic_first" | "token_window" | "fixed_size"
    "chunk_size": 384,               // Target tokens
    "chunk_overlap": 58,             // ~15% of chunk_size
    "max_chunks_per_source": 1000,   // Safety limit
    "semantic_breakpoints": ["heading", "paragraph", "list", "table"],
    "tokenizer": "cl100k_base",      // Same as GPT-4
    "min_chunk_size": 64,            // Don't create tiny chunks
    "max_chunk_size": 1024,          // Hard limit
    "deduplicate_boilerplate": true  // Remove headers/footers
  }
}
Per-project override in projects.settings:

json
{
  "chunking": {
    "chunk_size": 512,
    "chunk_overlap": 77,
    "semantic_breakpoints": ["heading", "paragraph"]
  }
}
1.3 Implementation Code
python
class DocumentChunker:
    def __init__(self, chunk_size=384, overlap=58, strategy="semantic_first"):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.strategy = strategy
        
        # Load tokenizer (shared with LLM)
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Semantic splitter for markdown/HTML structure
        self.semantic_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "heading_1"),
                ("##", "heading_2"),
                ("###", "heading_3"),
            ],
            strip_headers=False,
        )
    
    def chunk_document(self, text: str, metadata: dict = None) -> List[Chunk]:
        """
        Split document into chunks with metadata tracking
        """
        chunks = []
        
        if self.strategy == "semantic_first":
            # Try semantic splitting first
            semantic_chunks = self._semantic_split(text)
            chunks.extend(semantic_chunks)
        else:
            # Fallback to token-based splitting
            chunks = self._token_based_split(text)
        
        # Apply token window constraints
        final_chunks = self._apply_token_limits(chunks)
        
        # Add metadata to each chunk
        for i, chunk in enumerate(final_chunks):
            chunk.metadata.update({
                "chunk_index": i,
                "total_chunks": len(final_chunks),
                "token_count": len(self.tokenizer.encode(chunk.text)),
                "char_count": len(chunk.text),
                "source_id": metadata.get("source_id"),
                "section_title": self._extract_section_title(chunk.text),
                "parent_chunk_id": metadata.get("parent_chunk_id"),
                "is_boilerplate": self._is_boilerplate(chunk.text),
            })
        
        return final_chunks
    
    def _semantic_split(self, text: str) -> List[Chunk]:
        """
        Split by semantic boundaries (headers, paragraphs)
        """
        # Convert to markdown if HTML
        if self._looks_like_html(text):
            text = markdownify(text)
        
        # Split by headers
        chunks = []
        current_chunk = ""
        current_tokens = 0
        
        # Process each line
        for line in text.split('\n'):
            line_tokens = len(self.tokenizer.encode(line))
            
            # Check if line is a header (semantic boundary)
            is_header = line.startswith('#') and line.count('#') <= 3
            
            if is_header or current_tokens + line_tokens > self.chunk_size:
                # Save current chunk if not empty
                if current_chunk.strip():
                    chunks.append(Chunk(text=current_chunk.strip()))
                    # Start new chunk with overlap
                    if self.overlap > 0:
                        # Keep last N tokens for overlap
                        overlap_text = self._get_overlap_text(current_chunk)
                        current_chunk = overlap_text + '\n' + line
                        current_tokens = len(self.tokenizer.encode(overlap_text)) + line_tokens
                    else:
                        current_chunk = line
                        current_tokens = line_tokens
                else:
                    current_chunk = line
                    current_tokens = line_tokens
            else:
                current_chunk += '\n' + line
                current_tokens += line_tokens
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(Chunk(text=current_chunk.strip()))
        
        return chunks
    
    def _token_based_split(self, text: str) -> List[Chunk]:
        """
        Fallback: Split by token count when semantic boundaries fail
        """
        tokens = self.tokenizer.encode(text)
        chunks = []
        
        for i in range(0, len(tokens), self.chunk_size - self.overlap):
            chunk_tokens = tokens[i:i + self.chunk_size]
            chunk_text = self.tokenizer.decode(chunk_tokens)
            
            # Try to find sentence boundaries for cleaner cuts
            chunk_text = self._clean_cut_points(chunk_text)
            
            chunks.append(Chunk(text=chunk_text))
        
        return chunks
    
    def _get_overlap_text(self, text: str, target_tokens: int = None) -> str:
        """
        Get trailing text for overlap (preserving sentence boundaries)
        """
        if target_tokens is None:
            target_tokens = self.overlap
        
        tokens = self.tokenizer.encode(text)
        if len(tokens) <= target_tokens:
            return text
        
        # Take last N tokens
        overlap_tokens = tokens[-target_tokens:]
        overlap_text = self.tokenizer.decode(overlap_tokens)
        
        # Adjust to sentence boundary
        sentences = overlap_text.split('. ')
        if len(sentences) > 1:
            # Keep complete sentences
            overlap_text = '. '.join(sentences[1:]) + '.'
        
        return overlap_text
1.4 Chunk Metadata Schema
sql
-- chunks.metadata JSONB structure
{
  "chunk_index": 0,                -- Position in document
  "token_count": 127,              -- Token count (cl100k_base)
  "char_count": 512,               -- Character count
  "page_number": 3,                -- Source page (PDFs)
  "section_title": "Introduction", -- Extracted section heading
  "parent_chunk_id": null,         -- For hierarchical chunks
  "is_boilerplate": false,         -- Header/footer/boilerplate
  "language": "en",                -- Detected language
  "has_code": false,               -- Contains code blocks
  "has_tables": false,             -- Contains tables
  "confidence": 0.95,              -- OCR/parsing confidence
  "embedding_model": "text-embedding-3-small", -- Which model used
  "embedding_version": "v1.0",     -- Embedding model version
  "chunking_strategy": "semantic_first" -- How this chunk was created
}
1.5 Quality Metrics
python
def evaluate_chunk_quality(chunks: List[Chunk]) -> dict:
    """
    Evaluate chunk quality for monitoring
    """
    metrics = {
        "total_chunks": len(chunks),
        "avg_tokens": 0,
        "avg_chars": 0,
        "token_distribution": [],  # Histogram
        "boilerplate_ratio": 0,
        "header_coverage": 0,      # % of chunks with section_title
        "overlap_efficiency": 0,   # How well overlap preserves context
    }
    
    token_counts = []
    boilerplate_count = 0
    header_count = 0
    
    for chunk in chunks:
        token_counts.append(chunk.metadata["token_count"])
        
        if chunk.metadata.get("is_boilerplate", False):
            boilerplate_count += 1
        
        if chunk.metadata.get("section_title"):
            header_count += 1
    
    metrics["avg_tokens"] = sum(token_counts) / len(token_counts)
    metrics["avg_chars"] = sum(c.metadata["char_count"] for c in chunks) / len(chunks)
    metrics["boilerplate_ratio"] = boilerplate_count / len(chunks)
    metrics["header_coverage"] = header_count / len(chunks)
    
    # Check distribution
    from collections import Counter
    metrics["token_distribution"] = Counter(
        min(tc, 1024) // 64 * 64 for tc in token_counts
    )
    
    return metrics
2. EMBEDDING STRATEGY
2.1 Embedding Models & Configuration
Supported Models (embeddings table):

sql
-- Default model (stored in projects.settings)
{
  "embedding": {
    "model": "text-embedding-3-small",  -- OpenAI default
    "dimension": 1536,                  -- Vector dimension
    "provider": "openai",               -- "openai" | "azure" | "cohere" | "voyage" | "local"
    "endpoint": null,                   -- Custom endpoint URL
    "api_key": null,                    -- Encrypted in database
    "batch_size": 100,                  -- Batch size for embedding
    "rate_limit_rpm": 3000,             -- Provider rate limit
    "cache_ttl_days": 30                -- Embedding cache duration
  }
}
Model Selection Logic:

python
class EmbeddingRouter:
    def __init__(self, project_settings: dict):
        self.config = project_settings.get("embedding", {})
        self.model = self.config.get("model", "text-embedding-3-small")
        self.provider = self.config.get("provider", "openai")
        self.dimension = self.config.get("dimension", 1536)
        
        # Initialize client based on provider
        if self.provider == "openai":
            self.client = OpenAIEmbeddingClient(
                model=self.model,
                api_key=decrypt(self.config.get("api_key")),  # User's key
                dimensions=self.dimension
            )
        elif self.provider == "local":
            self.client = LocalEmbeddingClient(
                model=self.model,  # e.g., "all-MiniLM-L6-v2"
                device="cuda" if torch.cuda.is_available() else "cpu"
            )
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple texts with batching and caching
        """
        # Check cache first
        cached_results = await self._check_cache(texts)
        
        # Texts not in cache
        uncached_texts = [text for i, text in enumerate(texts) 
                         if cached_results[i] is None]
        uncached_indices = [i for i, cached in enumerate(cached_results) 
                           if cached is None]
        
        if uncached_texts:
            # Batch process
            embeddings = await self._batch_embed(uncached_texts)
            
            # Update cache
            await self._update_cache(uncached_texts, embeddings)
            
            # Merge with cached results
            for idx, emb in zip(uncached_indices, embeddings):
                cached_results[idx] = emb
        
        return cached_results
2.2 Embedding Cache Strategy
Cache Table Schema (cache table):

sql
-- cache table structure for embeddings
CREATE TABLE cache (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,      -- SHA256(text + model + config_hash)
    cache_type TEXT NOT NULL DEFAULT 'embedding',
    data JSONB NOT NULL,          -- {"embedding": [0.1, 0.2, ...], "model": "..."}
    size_bytes INT DEFAULT 0,     -- Approximate size
    hits BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    UNIQUE (project_id, cache_key, cache_type)
);

-- Index for quick lookups
CREATE INDEX idx_cache_embedding_lookup ON cache 
USING HASH (cache_key) WHERE cache_type = 'embedding';
Cache Implementation:

python
class EmbeddingCache:
    def __init__(self, db_pool, redis_client):
        self.db = db_pool
        self.redis = redis_client  # For hot cache
    
    async def get_embeddings(self, texts: List[str], model_config: dict) -> List[Optional[List[float]]]:
        """
        Get embeddings from cache (Redis hot cache → PostgreSQL cold cache)
        """
        results = [None] * len(texts)
        
        # 1. Check Redis (hot cache, 1 hour TTL)
        redis_keys = [self._redis_key(text, model_config) for text in texts]
        redis_values = await self.redis.mget(redis_keys)
        
        for i, value in enumerate(redis_values):
            if value:
                results[i] = json.loads(value)
        
        # 2. Check PostgreSQL for remaining (cold cache, 30 days TTL)
        uncached_indices = [i for i, emb in enumerate(results) if emb is None]
        if uncached_indices:
            db_embeddings = await self._get_from_db(
                [texts[i] for i in uncached_indices],
                model_config
            )
            for idx, emb in zip(uncached_indices, db_embeddings):
                if emb:
                    results[idx] = emb
                    # Populate Redis for next time
                    await self.redis.setex(
                        redis_keys[idx],
                        3600,  # 1 hour
                        json.dumps(emb)
                    )
        
        return results
    
    def _redis_key(self, text: str, model_config: dict) -> str:
        """Generate Redis cache key"""
        config_hash = hashlib.md5(
            json.dumps(model_config, sort_keys=True).encode()
        ).hexdigest()[:8]
        
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        
        return f"embed:{config_hash}:{text_hash}"
2.3 Batch Processing & Rate Limiting
python
class BatchEmbeddingProcessor:
    def __init__(self, embedding_client, max_batch_size=100, max_concurrent=5):
        self.client = embedding_client
        self.max_batch_size = max_batch_size
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.rate_limiter = TokenBucketRateLimiter(
            tokens_per_minute=3000,  # OpenAI default
            bucket_size=100
        )
    
    async def process_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Process texts in batches with rate limiting
        """
        all_embeddings = []
        
        # Split into batches
        for i in range(0, len(texts), self.max_batch_size):
            batch = texts[i:i + self.max_batch_size]
            
            async with self.semaphore:
                # Wait for rate limit token
                await self.rate_limiter.wait_for_token()
                
                # Process batch
                embeddings = await self.client.embed_texts(batch)
                all_embeddings.extend(embeddings)
        
        return all_embeddings
3. HYBRID RETRIEVAL PIPELINE
3.1 Query Processing
python
class QueryProcessor:
    def __init__(self):
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
    
    async def process_query(self, query: str, conversation_history: List[dict] = None) -> ProcessedQuery:
        """
        Process user query before retrieval
        """
        # 1. Clean and normalize
        query = self._clean_query(query)
        
        # 2. Extract key terms (for keyword search)
        key_terms = self._extract_key_terms(query)
        
        # 3. Query expansion (if enabled)
        expanded_queries = await self._expand_query(query, conversation_history)
        
        # 4. Generate embeddings for each query variant
        embeddings = []
        for q in [query] + expanded_queries:
            emb = await self._embed_query(q)
            embeddings.append({
                "query": q,
                "embedding": emb,
                "weight": 1.0 if q == query else 0.7  # Original query gets higher weight
            })
        
        return ProcessedQuery(
            original=query,
            key_terms=key_terms,
            embeddings=embeddings,
            expanded_queries=expanded_queries,
            token_count=len(self.tokenizer.encode(query))
        )
    
    def _extract_key_terms(self, query: str, max_terms: int = 10) -> List[str]:
        """
        Extract important terms for keyword search
        """
        # Remove stopwords
        stop_words = set(["what", "how", "why", "the", "a", "an", "is", "are", "can", "do"])
        words = query.lower().split()
        filtered = [w for w in words if w not in stop_words and len(w) > 2]
        
        # Use TF-IDF style weighting (simple version)
        term_scores = {}
        for word in filtered:
            term_scores[word] = term_scores.get(word, 0) + 1
        
        # Sort by score
        sorted_terms = sorted(term_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [term for term, score in sorted_terms[:max_terms]]
    
    async def _expand_query(self, query: str, history: List[dict]) -> List[str]:
        """
        Generate query variations for better recall
        """
        expansions = []
        
        # 1. Add conversation context
        if history and len(history) > 0:
            last_turn = history[-1]
            if last_turn.get("role") == "user":
                # Combine with previous user message
                expansions.append(f"{last_turn['content']} {query}")
        
        # 2. Generate rephrasings (simple rule-based)
        rephrasings = [
            query,
            query + " in detail",
            "Explain " + query,
            "Information about " + query,
        ]
        
        # Remove duplicates
        seen = set()
        unique_expansions = []
        for exp in expansions + rephrasings:
            if exp not in seen and exp != query:
                seen.add(exp)
                unique_expansions.append(exp)
        
        return unique_expansions[:3]  # Limit to 3 expansions
3.2 Vector Search (pgvector)
python
class VectorSearch:
    def __init__(self, db_pool, embedding_dim=1536):
        self.db = db_pool
    
    async def search(
        self, 
        embedding: List[float], 
        project_id: str,
        limit: int = 50,
        filters: dict = None
    ) -> List[SearchResult]:
        """
        Vector similarity search using pgvector
        """
        # Build WHERE clause with filters
        where_clauses = ["c.project_id = :project_id"]
        params = {"project_id": project_id, "embedding": embedding}
        
        if filters:
            if "source_ids" in filters:
                where_clauses.append("c.source_id = ANY(:source_ids)")
                params["source_ids"] = filters["source_ids"]
            
            if "min_date" in filters:
                where_clauses.append("s.created_at >= :min_date")
                params["min_date"] = filters["min_date"]
            
            if "max_date" in filters:
                where_clauses.append("s.created_at <= :max_date")
                params["max_date"] = filters["max_date"]
        
        where_sql = " AND ".join(where_clauses)
        
        # HNSW index search with cosine similarity
        query = f"""
        SELECT 
            c.id,
            c.text,
            c.metadata,
            s.id as source_id,
            s.metadata as source_metadata,
            1 - (e.embedding <=> :embedding::vector) as similarity_score,
            ROW_NUMBER() OVER (ORDER BY e.embedding <=> :embedding::vector) as rank
        FROM chunks c
        JOIN embeddings e ON c.id = e.chunk_id
        JOIN sources s ON c.source_id = s.id
        WHERE {where_sql}
        ORDER BY e.embedding <=> :embedding::vector
        LIMIT :limit
        """
        
        params["limit"] = limit
        
        rows = await self.db.fetch_all(query, params)
        
        return [
            SearchResult(
                chunk_id=row["id"],
                text=row["text"],
                metadata=row["metadata"],
                source_id=row["source_id"],
                source_metadata=row["source_metadata"],
                vector_score=row["similarity_score"],
                rank=row["rank"]
            )
            for row in rows
        ]
    
    async def multi_vector_search(
        self,
        embeddings: List[List[float]],
        project_id: str,
        limit_per_vector: int = 20,
        total_limit: int = 50
    ) -> List[SearchResult]:
        """
        Search with multiple query embeddings (for query expansion)
        """
        all_results = []
        
        for i, emb in enumerate(embeddings):
            results = await self.search(
                embedding=emb,
                project_id=project_id,
                limit=limit_per_vector,
                filters=None  # Same filters for all
            )
            
            # Adjust scores based on query weight
            weight = emb.get("weight", 1.0)
            for result in results:
                result.vector_score *= weight
                result.query_index = i
            
            all_results.extend(results)
        
        # Deduplicate by chunk_id, keeping highest score
        seen = {}
        for result in all_results:
            if result.chunk_id not in seen or result.vector_score > seen[result.chunk_id].vector_score:
                seen[result.chunk_id] = result
        
        # Sort and limit
        sorted_results = sorted(seen.values(), key=lambda x: x.vector_score, reverse=True)
        return sorted_results[:total_limit]
3.3 Keyword Search (Postgres TSVECTOR)
python
class KeywordSearch:
    def __init__(self, db_pool):
        self.db = db_pool
    
    async def search(
        self,
        terms: List[str],
        project_id: str,
        limit: int = 50,
        filters: dict = None
    ) -> List[SearchResult]:
        """
        Full-text search using Postgres TSVECTOR
        """
        # Build search query from terms
        # Use AND for precision, OR for recall (configurable)
        search_mode = "AND"  # From project settings
        tsquery_terms = []
        
        for term in terms:
            # Clean term for tsquery
            clean_term = re.sub(r'[^\w\s]', '', term).strip()
            if len(clean_term) >= 2:  # Ignore very short terms
                tsquery_terms.append(f"{clean_term}:*")
        
        if not tsquery_terms:
            return []
        
        tsquery = " & ".join(tsquery_terms) if search_mode == "AND" else " | ".join(tsquery_terms)
        
        # Build WHERE clause
        where_clauses = [
            "c.project_id = :project_id",
            "c.search_tsvector @@ to_tsquery('english', :tsquery)"
        ]
        
        params = {
            "project_id": project_id,
            "tsquery": tsquery,
            "limit": limit
        }
        
        if filters:
            # Add filter conditions similar to vector search
            pass
        
        where_sql = " AND ".join(where_clauses)
        
        # BM25-like scoring with ts_rank
        query = f"""
        SELECT 
            c.id,
            c.text,
            c.metadata,
            s.id as source_id,
            s.metadata as source_metadata,
            ts_rank(c.search_tsvector, to_tsquery('english', :tsquery)) as keyword_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank(c.search_tsvector, to_tsquery('english', :tsquery)) DESC) as rank
        FROM chunks c
        JOIN sources s ON c.source_id = s.id
        WHERE {where_sql}
        ORDER BY keyword_score DESC
        LIMIT :limit
        """
        
        rows = await self.db.fetch_all(query, params)
        
        return [
            SearchResult(
                chunk_id=row["id"],
                text=row["text"],
                metadata=row["metadata"],
                source_id=row["source_id"],
                source_metadata=row["source_metadata"],
                keyword_score=float(row["keyword_score"]),
                rank=row["rank"]
            )
            for row in rows
        ]
3.4 Score Fusion (Reciprocal Rank Fusion)
python
class ReciprocalRankFusion:
    def __init__(self, k: int = 60):
        """
        RRF combines multiple ranked lists
        
        Score = sum(1 / (k + rank))
        Lower k = more weight to top ranks
        """
        self.k = k
    
    def fuse(
        self,
        vector_results: List[SearchResult],
        keyword_results: List[SearchResult],
        weights: dict = None
    ) -> List[FusedResult]:
        """
        Fuse vector and keyword results using RRF
        """
        if weights is None:
            weights = {"vector": 1.0, "keyword": 1.0}
        
        # Create mapping of chunk_id -> scores
        scores = {}
        
        # Process vector results
        for i, result in enumerate(vector_results):
            chunk_id = result.chunk_id
            if chunk_id not in scores:
                scores[chunk_id] = {"vector_rank": i + 1, "keyword_rank": None}
            else:
                scores[chunk_id]["vector_rank"] = i + 1
            
            # Store the result object
            scores[chunk_id]["result"] = result
        
        # Process keyword results
        for i, result in enumerate(keyword_results):
            chunk_id = result.chunk_id
            if chunk_id not in scores:
                scores[chunk_id] = {"vector_rank": None, "keyword_rank": i + 1}
            else:
                scores[chunk_id]["keyword_rank"] = i + 1
            
            if "result" not in scores[chunk_id]:
                scores[chunk_id]["result"] = result
        
        # Calculate RRF scores
        fused_results = []
        for chunk_id, data in scores.items():
            rrf_score = 0.0
            
            # Vector component
            if data["vector_rank"] is not None:
                rrf_score += weights["vector"] * (1.0 / (self.k + data["vector_rank"]))
            
            # Keyword component
            if data["keyword_rank"] is not None:
                rrf_score += weights["keyword"] * (1.0 / (self.k + data["keyword_rank"]))
            
            # Create fused result
            fused_result = FusedResult(
                chunk_id=chunk_id,
                text=data["result"].text,
                metadata=data["result"].metadata,
                source_id=data["result"].source_id,
                source_metadata=data["result"].source_metadata,
                vector_score=getattr(data["result"], 'vector_score', 0),
                keyword_score=getattr(data["result"], 'keyword_score', 0),
                rrf_score=rrf_score,
                vector_rank=data["vector_rank"],
                keyword_rank=data["keyword_rank"]
            )
            fused_results.append(fused_result)
        
        # Sort by RRF score
        fused_results.sort(key=lambda x: x.rrf_score, reverse=True)
        
        return fused_results
    
    def adaptive_fusion(
        self,
        vector_results: List[SearchResult],
        keyword_results: List[SearchResult],
        query_length: int,
        query_type: str = "general"
    ) -> List[FusedResult]:
        """
        Adaptive fusion based on query characteristics
        """
        # Adjust weights based on query
        weights = {"vector": 1.0, "keyword": 1.0}
        
        # Long queries benefit more from keyword search
        if query_length > 20:
            weights["keyword"] *= 1.5
        
        # Factual/definition queries
        if any(word in query_type.lower() for word in ["what", "define", "who", "when"]):
            weights["vector"] *= 1.2
        
        # Conversational/follow-up queries
        if query_type == "followup":
            weights["vector"] *= 1.5
        
        return self.fuse(vector_results, keyword_results, weights)
3.5 Reranking (Cross-Encoder)
python
class Reranker:
    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        """
        Lightweight cross-encoder for reranking
        
        Models:
        - BAAI/bge-reranker-base (140MB, ~100ms)
        - BAAI/bge-reranker-large (1.3GB, ~300ms)
        - cross-encoder/ms-marco-MiniLM-L-6-v2 (90MB, ~50ms)
        """
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    async def load_model(self):
        """Lazy load the model"""
        if self.model is None:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
    
    async def rerank(
        self,
        query: str,
        candidates: List[FusedResult],
        top_k: int = 10
    ) -> List[RerankedResult]:
        """
        Rerank candidates using cross-encoder
        """
        await self.load_model()
        
        if not candidates or len(candidates) <= top_k:
            # No need to rerank if we have few candidates
            return [
                RerankedResult(
                    **candidate.__dict__,
                    reranker_score=1.0,
                    final_score=candidate.rrf_score
                )
                for candidate in candidates
            ]
        
        # Prepare inputs
        pairs = [(query, candidate.text) for candidate in candidates]
        
        # Batch process
        batch_size = 32
        reranker_scores = []
        
        for i in range(0, len(pairs), batch_size):
            batch_pairs = pairs[i:i + batch_size]
            
            # Tokenize
            inputs = self.tokenizer(
                batch_pairs,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            ).to(self.device)
            
            # Inference
            with torch.no_grad():
                scores = self.model(**inputs).logits.squeeze(-1)
                reranker_scores.extend(scores.cpu().tolist())
        
        # Normalize scores to [0, 1]
        if reranker_scores:
            min_score = min(reranker_scores)
            max_score = max(reranker_scores)
            if max_score > min_score:
                reranker_scores = [
                    (score - min_score) / (max_score - min_score)
                    for score in reranker_scores
                ]
        
        # Combine scores: RRF score * reranker score
        reranked = []
        for candidate, reranker_score in zip(candidates, reranker_scores):
            # Weighted combination (can be tuned)
            final_score = (0.7 * candidate.rrf_score) + (0.3 * reranker_score)
            
            reranked.append(
                RerankedResult(
                    **candidate.__dict__,
                    reranker_score=reranker_score,
                    final_score=final_score
                )
            )
        
        # Sort by final score
        reranked.sort(key=lambda x: x.final_score, reverse=True)
        
        return reranked[:top_k]
4. CONTEXT ASSEMBLY
4.1 Context Window Optimization
python
class ContextAssembler:
    def __init__(self, llm_context_window: int = 128000):  # GPT-4 Turbo
        self.llm_context_window = llm_context_window
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Budget allocation
        self.budget = {
            "system_prompt": 1000,
            "conversation_history": 8000,  # ~5-10 turns
            "retrieved_context": llm_context_window - 9000,  # Remainder
            "response": 4000  # Space for response
        }
    
    async def assemble_context(
        self,
        query: str,
        reranked_results: List[RerankedResult],
        conversation_history: List[dict],
        system_prompt: str = None
    ) -> AssembledContext:
        """
        Assemble final context within token limits
        """
        # 1. Calculate token usage
        system_tokens = len(self.tokenizer.encode(system_prompt or ""))
        history_tokens = self._calculate_history_tokens(conversation_history)
        query_tokens = len(self.tokenizer.encode(query))
        
        # 2. Allocate budget for retrieved chunks
        available_tokens = self.budget["retrieved_context"] - query_tokens
        
        # 3. Select chunks greedily by score
        selected_chunks = []
        used_tokens = 0
        
        for result in reranked_results:
            chunk_tokens = result.metadata.get("token_count", 
                             len(self.tokenizer.encode(result.text)))
            
            if used_tokens + chunk_tokens <= available_tokens:
                selected_chunks.append(result)
                used_tokens += chunk_tokens
            else:
                # Try to fit by trimming overlap
                trimmed_text = self._trim_chunk(result.text, available_tokens - used_tokens)
                if trimmed_text:
                    result.text = trimmed_text
                    selected_chunks.append(result)
                    used_tokens += len(self.tokenizer.encode(trimmed_text))
                break
        
        # 4. Format context
        context_parts = []
        
        # System prompt
        if system_prompt:
            context_parts.append(f"System: {system_prompt}")
        
        # Conversation history (trimmed if needed)
        history_text = self._format_history(conversation_history, self.budget["conversation_history"])
        if history_text:
            context_parts.append(f"History:\n{history_text}")
        
        # Retrieved documents
        docs_text = self._format_documents(selected_chunks)
        context_parts.append(f"Documents:\n{docs_text}")
        
        # Query
        context_parts.append(f"Question: {query}")
        
        # Combine
        full_context = "\n\n".join(context_parts)
        
        return AssembledContext(
            full_text=full_context,
            selected_chunks=selected_chunks,
            total_tokens=len(self.tokenizer.encode(full_context)),
            chunk_tokens=used_tokens,
            history_tokens=history_tokens,
            query_tokens=query_tokens
        )
    
    def _format_documents(self, chunks: List[RerankedResult]) -> str:
        """Format chunks for LLM consumption"""
        formatted = []
        
        for i, chunk in enumerate(chunks):
            source_info = chunk.source_metadata.get("title", "Document")
            section = chunk.metadata.get("section_title", "")
            
            header = f"[Document {i+1}"
            if source_info:
                header += f": {source_info}"
            if section:
                header += f" - {section}"
            header += "]"
            
            formatted.append(f"{header}\n{chunk.text}")
        
        return "\n\n".join(formatted)
    
    def _trim_chunk(self, text: str, max_tokens: int) -> str:
        """Trim chunk to fit token budget while preserving meaning"""
        if max_tokens <= 0:
            return ""
        
        tokens = self.tokenizer.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        # Try to keep the beginning (often most relevant)
        trimmed_tokens = tokens[:max_tokens]
        
        # Adjust to sentence boundary
        trimmed_text = self.tokenizer.decode(trimmed_tokens)
        
        # Find last sentence end
        last_period = trimmed_text.rfind('.')
        last_question = trimmed_text.rfind('?')
        last_exclamation = trimmed_text.rfind('!')
        
        sentence_end = max(last_period, last_question, last_exclamation)
        if sentence_end > 0.5 * len(trimmed_text):  # Keep if we have reasonable end
            return trimmed_text[:sentence_end + 1]
        
        return trimmed_text  # Return as-is if no good break
4.2 Source Citation & Attribution
python
class CitationGenerator:
    def generate_citations(self, chunks: List[RerankedResult]) -> List[Citation]:
        """
        Generate citations for retrieved chunks
        """
        citations = []
        
        for i, chunk in enumerate(chunks):
            source_meta = chunk.source_metadata
            chunk_meta = chunk.metadata
            
            citation = {
                "id": i + 1,  # [1], [2], etc.
                "chunk_id": chunk.chunk_id,
                "source_id": chunk.source_id,
                "title": source_meta.get("title", "Document"),
                "page": chunk_meta.get("page_number"),
                "section": chunk_meta.get("section_title"),
                "confidence": chunk.final_score,  # Overall relevance score
                "text_preview": chunk.text[:200] + "..." if len(chunk.text) > 200 else chunk.text
            }
            
            # Format citation string
            citation_str = f"[{citation['id']}]"
            if citation["title"]:
                citation_str += f" {citation['title']}"
            if citation["page"]:
                citation_str += f" (page {citation['page']})"
            if citation["section"]:
                citation_str += f", {citation['section']}"
            
            citation["formatted"] = citation_str
            citations.append(citation)
        
        return citations
5. PERFORMANCE MONITORING
5.1 Retrieval Metrics
sql
-- Tracking table for retrieval performance
CREATE TABLE retrieval_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    query_id UUID,  -- Links to conversation
    query_length INT,
    retrieval_time_ms INT,
    chunks_considered INT,
    chunks_returned INT,
    reranker_used BOOLEAN DEFAULT false,
    vector_search_time_ms INT,
    keyword_search_time_ms INT,
    fusion_time_ms INT,
    rerank_time_ms INT,
    cache_hit_rate DECIMAL(5,4),  -- 0.0 to 1.0
    avg_vector_score DECIMAL(5,4),
    avg_keyword_score DECIMAL(5,4),
    avg_reranker_score DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX idx_retrieval_metrics_project_time ON retrieval_metrics(project_id, created_at);
CREATE INDEX idx_retrieval_metrics_performance ON retrieval_metrics(retrieval_time_ms);
5.2 Quality Metrics
python
class RetrievalEvaluator:
    async def evaluate_retrieval(
        self,
        query: str,
        retrieved_chunks: List[RerankedResult],
        llm_response: str
    ) -> RetrievalMetrics:
        """
        Evaluate retrieval quality (for monitoring, not real-time)
        """
        metrics = {
            "query_length": len(query.split()),
            "total_chunks": len(retrieved_chunks),
            "avg_chunk_length": 0,
            "score_distribution": [],
            "source_diversity": 0,
            "position_bias": 0,  # Are high scores clustered at top?
            "coverage_ratio": 0,  # How many unique sources
        }
        
        if not retrieved_chunks:
            return metrics
        
        # Calculate statistics
        chunk_lengths = []
        scores = []
        sources = set()
        
        for chunk in retrieved_chunks:
            chunk_lengths.append(len(chunk.text.split()))
            scores.append(chunk.final_score)
            sources.add(chunk.source_id)
        
        metrics["avg_chunk_length"] = sum(chunk_lengths) / len(chunk_lengths)
        metrics["source_diversity"] = len(sources) / len(retrieved_chunks)
        metrics["score_distribution"] = {
            "min": min(scores),
            "max": max(scores),
            "mean": sum(scores) / len(scores),
            "std": np.std(scores) if len(scores) > 1 else 0
        }
        
        # Check if top scores are actually at top
        sorted_by_score = sorted(retrieved_chunks, key=lambda x: x.final_score, reverse=True)
        position_correlation = []
        for i, (actual, sorted_chunk) in enumerate(zip(retrieved_chunks, sorted_by_score)):
            if actual.chunk_id == sorted_chunk.chunk_id:
                position_correlation.append(1)
            else:
                position_correlation.append(0)
        
        metrics["position_bias"] = sum(position_correlation) / len(position_correlation)
        
        return metrics
5.3 A/B Testing Framework
python
class RetrievalABTest:
    def __init__(self, db_pool):
        self.db = db_pool
    
    async def run_experiment(
        self,
        project_id: str,
        experiment_name: str,
        variants: List[dict]
    ):
        """
        Run A/B test for retrieval parameters
        """
        # Example variants:
        # [
        #   {"name": "default", "chunk_size": 384, "overlap": 58, "k": 60},
        #   {"name": "large_chunks", "chunk_size": 512, "overlap": 77, "k": 40},
        #   {"name": "no_rerank", "chunk_size": 384, "overlap": 58, "rerank": false}
        # ]
        
        # Randomly assign queries to variants
        variant_assignments = {}
        
        # Track metrics per variant
        variant_metrics = {v["name"]: [] for v in variants}
        
        # Implement experiment logic...
        pass
6. CONFIGURATION & TUNING
6.1 Project-Level Configuration
json
{
  "retrieval": {
    "strategy": "hybrid",
    "vector_weight": 1.0,
    "keyword_weight": 1.0,
    "fusion_method": "rrf",
    "rrf_k": 60,
    "enable_reranking": true,
    "reranker_model": "BAAI/bge-reranker-base",
    "reranker_weight": 0.3,
    "max_chunks_to_rerank": 50,
    "max_final_chunks": 10,
    "min_relevance_score": 0.1,
    "enable_query_expansion": true,
    "max_query_expansions": 3,
    "cache_embeddings": true,
    "embedding_cache_ttl_days": 30,
    "adaptive_fusion": true
  },
  "chunking": {
    "strategy": "semantic_first",
    "chunk_size": 384,
    "chunk_overlap": 58,
    "max_chunks_per_source": 1000,
    "deduplicate_boilerplate": true
  },
  "context": {
    "max_total_tokens": 128000,
    "system_prompt_tokens": 1000,
    "history_tokens": 8000,
    "response_tokens": 4000,
    "chunk_selection_strategy": "greedy_by_score",
    "include_citations": true,
    "citation_format": "bracketed"
  }
}
6.2 Tuning Guidelines
For Better Precision (fewer, more relevant results):

json
{
  "chunk_size": 256,
  "overlap": 38,
  "rrf_k": 30,  // Lower K gives more weight to top ranks
  "vector_weight": 1.5,
  "keyword_weight": 0.8,
  "min_relevance_score": 0.3,
  "max_final_chunks": 5
}
For Better Recall (more comprehensive results):

json
{
  "chunk_size": 512,
  "overlap": 77,
  "rrf_k": 100,  // Higher K reduces rank bias
  "vector_weight": 0.8,
  "keyword_weight": 1.2,
  "enable_query_expansion": true,
  "max_query_expansions": 5,
  "max_final_chunks": 20
}
For Technical/Code Documentation:

json
{
  "chunk_size": 256,
  "semantic_breakpoints": ["heading", "code_block", "function_def"],
  "keyword_weight": 1.5,  // Code searches benefit from exact matches
  "enable_reranking": false  // Rerankers struggle with code
}
7. INTEGRATION WITH SCHEMA.SQL
7.1 Database Schema Alignment
sql
-- Retrieval uses these tables from schema.sql:

-- 1. chunks table (for text and metadata)
SELECT id, text, metadata, search_tsvector 
FROM chunks 
WHERE project_id = :project_id;

-- 2. embeddings table (for vector search)
SELECT chunk_id, embedding 
FROM embeddings 
WHERE chunk_id IN (SELECT id FROM chunks WHERE project_id = :project_id);

-- 3. sources table (for source metadata)
SELECT id, metadata 
FROM sources 
WHERE project_id = :project_id;

-- 4. cache table (for embedding cache)
SELECT cache_key, data 
FROM cache 
WHERE project_id = :project_id 
  AND cache_type = 'embedding' 
  AND expires_at > NOW();

-- 5. projects table (for retrieval settings)
SELECT settings->'retrieval', settings->'chunking'
FROM projects 
WHERE id = :project_id;
7.2 Index Optimization for Retrieval
sql
-- Essential indexes for performance:
-- 1. Vector search index (HNSW)
CREATE INDEX idx_embeddings_hnsw ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. Full-text search index
CREATE INDEX idx_chunks_tsvector ON chunks 
USING GIN(search_tsvector);

-- 3. Composite index for tenant filtering
CREATE INDEX idx_chunks_project_embedding ON chunks(project_id, id)
INCLUDE (text, metadata);

-- 4. Covering index for common retrieval queries
CREATE INDEX idx_retrieval_covering ON chunks(project_id, source_id, id)
INCLUDE (text, metadata, search_tsvector);
8. GETTING STARTED
8.1 Quick Start Configuration
python
# Minimal configuration to get started
DEFAULT_RETRIEVAL_CONFIG = {
    "chunk_size": 384,
    "chunk_overlap": 58,
    "embedding_model": "text-embedding-3-small",
    "reranker_model": "BAAI/bge-reranker-base",
    "max_results": 10,
    "enable_cache": True,
}

# Initialize retrieval pipeline
retrieval_pipeline = RetrievalPipeline(
    db_pool=db_pool,
    config=DEFAULT_RETRIEVAL_CONFIG
)

# Perform retrieval
results = await retrieval_pipeline.retrieve(
    query="What is RAG?",
    project_id="project-uuid",
    conversation_history=history
)
8.2 Performance Targets
Metric	Target	Alert Threshold
Total Latency	< 500ms	> 1000ms
Vector Search	< 100ms	> 200ms
Keyword Search	< 50ms	> 100ms
Reranking	< 150ms	> 300ms
Cache Hit Rate	> 70%	< 50%
Recall@10	> 80%	< 60%
Precision@5	> 70%	< 50%
8.3 Monitoring Dashboard
sql
-- Key metrics to monitor
SELECT 
    DATE(created_at) as day,
    COUNT(*) as queries,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY retrieval_time_ms) as p95_latency,
    AVG(cache_hit_rate) as avg_cache_hit,
    AVG(chunks_returned) as avg_chunks_returned
FROM retrieval_metrics
WHERE project_id = :project_id
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
9. TROUBLESHOOTING
Common Issues & Solutions:
1. Slow Retrieval (>1000ms)

Check pgvector HNSW index (ANALYZE embeddings;)

Increase ef_search parameter for vector search

Add Redis caching for embeddings

Reduce max_chunks_to_rerank from 50 to 20

2. Poor Relevance

Adjust chunk size (smaller = more precise)

Increase keyword weight for factual queries

Enable query expansion

Tune RRF k parameter (lower for precision)

3. Missing Relevant Documents

Check embedding model matches chunking model

Verify full-text search includes all terms

Increase chunk overlap to 20-25%

Check for stopword removal being too aggressive

4. High Token Usage

Reduce max_final_chunks

Implement chunk trimming in context assembly

Use more aggressive token counting

Consider hierarchical chunk compression

5. Cache Inefficiency

Increase embedding cache TTL

Implement semantic caching (similar queries)

Add Redis hot cache layer

Monitor cache hit rate dashboard

10. FUTURE ENHANCEMENTS
Planned Improvements:
Hierarchical Retrieval: Parent-child chunk relationships

Multimodal Search: Image + text hybrid retrieval

Query Intent Classification: Adaptive strategies per query type

Learning-to-Rank: ML model for fusion weights

Real-time Reindexing: Update embeddings without downtime

Federated Search: Multiple vector databases

Semantic Caching: Cache similar queries, not exact matches

Research Directions:
ColBERT-style late interaction

Dense passage retrieval (DPR) fine-tuning

Cross-encoder distillation for faster reranking

Learned sparse representations (SPLADE)

Retrieval-augmented generation evaluation metrics

✅ IMPLEMENTATION CHECKLIST
Phase 1 (Core Retrieval):
Chunking pipeline with semantic splitting

pgvector HNSW index configuration

Postgres TSVECTOR full-text search

Reciprocal Rank Fusion implementation

Basic context assembly

Phase 2 (Optimization):
Embedding caching (Redis + PostgreSQL)

Query expansion and rewriting

Cross-encoder reranking

Performance monitoring

A/B testing framework

Phase 3 (Advanced Features):
Adaptive fusion weights

Hierarchical chunking

Semantic caching

Real-time metrics dashboard

