import { Markdown } from "@/components/markdown";

const content = `# Retrieval Pipeline

How the RAG system finds relevant content for chat queries.

## Pipeline Overview

\`\`\`
User Query → Query Processing → Hybrid Search → Ranking → Context → Response
                ↓                                    ↓
         Query Expansion                    Reciprocal Rank Fusion
                ↓                                    ↓
         Embed Generation                   Cross-Encoder Rerank
\`\`\`

## 1. Query Processing

- Clean and normalize input
- Extract key terms for keyword search
- Generate query variations for better recall

## 2. Embedding Generation

- **Model**: Azure OpenAI \`text-embedding-3-small\`
- **Dimensions**: 1536

### Caching Strategy
\`\`\`
Redis (hot) → PostgreSQL (cold) → API
   1 hour         30 days
\`\`\`

## 3. Hybrid Search

### Vector Search (pgvector)
Semantic similarity using HNSW index.

### Keyword Search (Postgres TSVECTOR)
Full-text search for exact matches.

### Why Hybrid?

| Search Type | Strength | Weakness |
|-------------|----------|----------|
| Vector | Semantic similarity | May miss exact terms |
| Keyword | Exact matches | No semantic understanding |

## 4. Score Fusion

**Reciprocal Rank Fusion (RRF)** combines rankings:
\`\`\`python
score = 1 / (k + rank)
\`\`\`

## 5. Reranking

Cross-encoder reranking for better relevance:
- **Model**: \`BAAI/bge-reranker-base\`

## 6. Context Assembly

Token budget allocation:
| Component | Budget |
|-----------|--------|
| System prompt | 1000 |
| History | 8000 |
| Context | ~110000 |
| Response | 4000 |

## Performance Targets

| Metric | Target | Alert |
|--------|--------|-------|
| Total Latency | < 500ms | > 1000ms |
| Vector Search | < 100ms | > 200ms |
| Cache Hit Rate | > 70% | < 50% |
`;

export default function RetrievalPipelinePage() {
  return <Markdown>{content}</Markdown>;
}
