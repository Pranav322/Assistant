# RAG Chatbot Platform

A production-ready RAG chatbot platform built with FastAPI, PostgreSQL (pgvector), Redis, and Dramatiq.

## Features
- Hybrid Search (Vector + Keyword)
- Semantic Chunking
- Async Background Processing
- Widget Integration

## Setup (Local)
- Create a `.env` file based on `.env.example`.
- Docker Compose uses `.env` automatically.

Required env vars (minimum for local dev):
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_DEPLOYMENT_NAME`
- `AZURE_EMBEDDING_API_KEY`
- `AZURE_EMBEDDING_DEPLOYMENT_NAME`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Optional overrides:
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `WIDGET_TOKEN_EXPIRE_SECONDS`
- `RATE_LIMIT_REQUESTS_PER_MINUTE`
- `RATE_LIMIT_TOKENS_PER_MINUTE`
- `RATE_LIMIT_IP_PER_MINUTE`
- `RATE_LIMIT_INGEST_PER_MINUTE`
- `RATE_LIMIT_CHAT_PER_MINUTE`
- `RATE_LIMIT_TOKEN_REFRESH_PER_MINUTE`
- `AZURE_EMBEDDING_ENDPOINT`
- `AZURE_EMBEDDING_API_VERSION`
- `S3_PUBLIC_URL`
- `S3_SSE`
- `MAX_FILE_SIZE_MB`
- `MAX_PDF_PAGES`
- `URL_FETCH_TIMEOUT_SECONDS`
- `URL_FETCH_MAX_REDIRECTS`
