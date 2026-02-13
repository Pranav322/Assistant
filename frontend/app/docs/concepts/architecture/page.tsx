import { Markdown } from "@/components/markdown";

const content = `# Architecture

High-level architecture of the RAG Chatbot Platform.

## System Overview

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Your Website                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Dashboard  │    │   Widget    │    │     API     │ │
│  │  (Next.js)  │    │  (Iframe)   │    │  (Clients)   │ │
│  └──────┬──────┘    └──────┬───────┘    └──────┬──────┘ │
└─────────┼──────────────────┼────────────────────┼────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    API Server (FastAPI)                  │
│  Auth │ Projects │ Chat │ Sources │ Rate Lim │ Cache  │
└────────────────────────────┬────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    Redis     │    │      S3      │
│  (pgvector)  │    │ Cache/Queue  │    │   Storage    │
└──────────────┘    └──────────────┘    └──────────────┘
\`\`\`

## Components

### API Server (FastAPI)
- Authentication (JWT and API keys)
- Chat API with RAG
- Project & Source management
- Rate limiting

### Background Workers (Dramatiq)
- Document parsing (PDF, URL)
- Chunking
- Embedding generation

### Database (PostgreSQL + pgvector)
- Projects, Sources, Chunks
- Vector embeddings

### Cache (Redis)
- Session cache
- Rate limit counters
- Background job queue

## Data Flow

### Document Ingestion
\`\`\`
User Upload → API → S3 → Queue → Worker Parse → Chunk → Embed → DB
\`\`\`

### Chat Request
\`\`\`
Widget → API → Embed Query → Vector Search → LLM → Response
\`\`\`

## Technology Stack

| Component | Technology |
|-----------|------------|
| API | FastAPI |
| Workers | Dramatiq |
| Database | PostgreSQL + pgvector |
| Cache/Queue | Redis |
| Storage | S3 (Cloudflare R2) |
| LLM | Azure OpenAI |
| Frontend | Next.js |
`;

export default function ArchitecturePage() {
  return <Markdown>{content}</Markdown>;
}
