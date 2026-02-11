# Implementation Plan and Checklist

This plan is the single source of truth for the work phases. It is aligned with
the documents in `.context/` and updated `AGENTS.md`.

How to use this file:
- Check off items when done.
- Add notes or links to PRs/commits next to completed items.
- Keep tests and CI in sync with each phase.

Stop conditions:
- If a required input is missing, stop and ask the user.
- Do not guess credentials or external service details.

Required inputs and decisions (confirm before work that depends on them):
- [ ] Primary LLM provider and model (Azure OpenAI vs OpenAI, model name)
- [ ] Embedding provider and deployment/model name
- [ ] Widget and API base domains (for origin validation and CSP)
- [ ] Object storage provider (S3/R2 endpoint, bucket, public URL)
- [ ] Secrets source and rotation approach (JWT_SECRET, ENCRYPTION_MASTER_KEY)
- [ ] Reranker strategy (local model vs external service)
- [ ] Cron strategy (pg_cron vs system cron vs Dramatiq periodic)

Decision log (lock choices here and reuse across phases):
| Decision | Value | Date | Owner | Notes |
| --- | --- | --- | --- | --- |
| Primary LLM provider/model | Azure OpenAI deployment `gpt-4.1` | 2026-02-11 | user | From `.env` |
| Embedding provider/model | Azure OpenAI `text-embedding-3-small` (deployment name `text-embedding-3-small`, separate API key) | 2026-02-11 | user | Add `AZURE_EMBEDDING_DEPLOYMENT_NAME` and embedding key |
| Widget/API base domains | Dev: localhost only; Prod: TBD (ask before enforcing) | 2026-02-11 | user | Needed for CSP/origin validation |
| Object storage provider | Cloudflare R2 (endpoint set, bucket `rag-chatbot`, public URL set) | 2026-02-11 | user | No custom domain yet |
| Secrets source/rotation | Env vars in dev; manual rotation every 90 days in prod | 2026-02-11 | assistant | Update if you want a different policy |
| Reranker strategy | Local cross-encoder `BAAI/bge-reranker-base` (configurable) | 2026-02-11 | assistant | Can disable per project settings |
| Cron strategy | pg_cron in production; Dramatiq periodic in dev | 2026-02-11 | assistant | Matches `security.md` options |

Definition of done (applies to every phase):
- [ ] Code changes implemented and reviewed against `.context/*`
- [ ] Tests added or updated for new behavior
- [ ] `uv run pytest tests/ --cov=app` passes (or noted exceptions)
- [ ] CI/CD updated if commands, env vars, or deps changed
- [ ] `IMPLEMENTATION_PLAN.md` checkboxes updated

Status keys:
- [ ] Not started
- [x] Done

Phase 0 - Spec alignment and repo hygiene
- [x] Align Alembic migrations and ORM models with `schema.sql` (tables, indexes, triggers)
- [x] Add missing tables in ORM: cache, rate_limits, ingestion_dead_letter
- [x] Ensure `search_tsvector` column and indexes exist for keyword search
- [x] Remove hardcoded secrets from `docker-compose.yml` and use env vars
- [x] Update docs for new env vars or local setup changes
- [x] Tests: migration apply (upgrade) smoke, run `uv run pytest tests/ --cov=app`
- [x] CI/CD: update workflows if migrations or env vars change (no workflow changes needed)
Definition of done:
- [ ] Schema alignment complete (ORM + migrations reflect `schema.sql`)
- [ ] Secrets removed from dev compose and documented env vars added
- [ ] Tests for migrations added and passing
- [ ] CI updated for new env vars or migrations

Phase 1 - Auth and security foundation (security.md)
- [ ] API key auth using bcrypt (create, verify, revoke)
- [ ] JWT widget tokens with issuer/audience/origin validation
- [ ] Origin validation utility and CSP header generation
- [ ] Require `project_id` filtering on all DB queries
- [ ] Rate limiting (IP, API key, endpoint)
- [ ] Audit logging for auth, access, and ingestion events
- [ ] Tests: unit tests for auth/origin/rate limit, integration tests for protected endpoints
- [ ] CI/CD: ensure secrets and env vars exist in test workflow
Definition of done:
- [ ] Auth and origin checks enforced on all protected endpoints
- [ ] Rate limiting and audit logging active
- [ ] Test coverage for auth/origin/rate limit added and passing
- [ ] CI updated for required secrets or env vars

Phase 2 - Ingestion hardening and storage (security.md, retrieval.md)
- [ ] File size/type validation and MIME sniffing
- [ ] PDF safety checks (page count, JS detection)
- [ ] URL ingestion with SSRF protections
- [ ] Storage encryption and metadata tracking
- [ ] Chunk metadata schema aligned with `retrieval.md`
- [ ] Tests: file validation matrix, SSRF blocklist tests, worker ingestion tests
- [ ] CI/CD: add any new test fixtures or dependencies
Definition of done:
- [ ] File and URL ingestion validated per `security.md`
- [ ] Storage metadata and chunk metadata aligned to `retrieval.md`
- [ ] Ingestion tests cover validation and worker flow
- [ ] CI updated for new fixtures or deps

Phase 3 - Retrieval core (retrieval.md Phase 1)
- [ ] Vector search (pgvector HNSW) with tenant filtering
- [ ] Keyword search (TSVECTOR) with tenant filtering
- [ ] Reciprocal Rank Fusion (RRF)
- [ ] Context assembly and citations
- [ ] Tests: unit tests for fusion/assembly, integration tests for vector and keyword search
- [ ] CI/CD: add pgvector container or fixtures if needed
Definition of done:
- [ ] Vector + keyword search implemented with tenant filtering
- [ ] RRF fusion and context assembly used by retrieval pipeline
- [ ] Retrieval tests cover search and fusion paths
- [ ] CI updated for pgvector dependency if required

Phase 4 - Chat endpoint and conversation storage (api_spec.md)
- [ ] `POST /projects/{project_id}/chat` with retrieval + LLM response
- [ ] Conversation and message persistence
- [ ] Token usage tracking
- [ ] Tests: chat API integration, conversation storage, citations formatting
- [ ] CI/CD: update env vars for LLM provider mocks if needed
Definition of done:
- [ ] Chat endpoint returns responses with citations
- [ ] Conversations and messages persisted
- [ ] Token usage tracking working
- [ ] Chat tests pass in CI

Phase 5 - Retrieval optimization (retrieval.md Phase 2)
- [ ] Embedding cache (Redis hot cache + Postgres cold cache)
- [ ] Query expansion and rewriting
- [ ] Reranking (cross-encoder)
- [ ] Retrieval metrics capture
- [ ] Tests: cache hit/miss, reranker on/off, metrics persistence
- [ ] CI/CD: add any new dependencies or model downloads
Definition of done:
- [ ] Caching, query expansion, and reranking implemented per settings
- [ ] Retrieval metrics recorded to database
- [ ] Optimization tests pass and are stable
- [ ] CI updated for new dependencies or model setup

Phase 6 - Widget and RUM metrics (widget_protocol.md, observability.md)
- [ ] `/tokens/widget` endpoint
- [ ] Widget origin handshake and postMessage protocol
- [ ] `/metrics/widget` ingestion
- [ ] Tests: Playwright E2E for widget flow, RUM ingestion tests
- [ ] CI/CD: add Playwright setup when harness is added
Definition of done:
- [ ] Widget token issuance and origin validation working
- [ ] Widget protocol implemented and tested
- [ ] RUM metrics ingestion live and tested
- [ ] E2E tests documented and runnable in CI

Phase 7 - Observability and readiness (observability.md)
- [ ] `/metrics` endpoint with required labels
- [ ] Structured logging with standard fields
- [ ] OpenTelemetry tracing for API, DB, Redis, LLM calls
- [ ] `/health/ready` with DB/Redis/S3 checks
- [ ] Tests: readiness probe integration, metrics endpoint smoke tests
- [ ] CI/CD: add observability env vars or exporters if required
Definition of done:
- [ ] `/metrics` and `/health/ready` implemented and tested
- [ ] Structured logging and tracing active
- [ ] Observability tests pass in CI
- [ ] Dashboards or exporter configs documented

Ongoing maintenance
- [ ] Keep `AGENTS.md` aligned with `.context/` and this plan
- [ ] Update tests and CI/CD whenever features or dependencies change
