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
- [x] Primary LLM provider and model (Azure OpenAI vs OpenAI, model name)
- [x] Embedding provider and deployment/model name
- [ ] Widget and API base domains (for origin validation and CSP) - prod domains pending
- [x] Object storage provider (S3/R2 endpoint, bucket, public URL)
- [x] Secrets source and rotation approach (JWT_SECRET, ENCRYPTION_MASTER_KEY)
- [x] Reranker strategy (local model vs external service)
- [x] Cron strategy (pg_cron vs system cron vs Dramatiq periodic)

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
- [x] Schema alignment complete (ORM + migrations reflect `schema.sql`)
- [x] Secrets removed from dev compose and documented env vars added
- [x] Tests for migrations added and passing
- [x] CI updated for new env vars or migrations

Phase 1 - Auth and security foundation (security.md)
- [x] API key auth using bcrypt (create, verify, revoke)
- [x] JWT widget tokens with issuer/audience/origin validation
- [x] Origin validation utility and CSP header generation
- [x] Require `project_id` filtering on all DB queries
- [x] Rate limiting (IP, API key, endpoint)
- [x] Audit logging for auth, access, and ingestion events
- [x] Tests: unit tests for auth/origin/rate limit, integration tests for protected endpoints
- [x] CI/CD: ensure secrets and env vars exist in test workflow
Definition of done:
- [x] Auth and origin checks enforced on all protected endpoints
- [x] Rate limiting and audit logging active
- [x] Test coverage for auth/origin/rate limit added and passing
- [x] CI updated for required secrets or env vars

Phase 2 - Ingestion hardening and storage (security.md, retrieval.md)
- [x] File size/type validation and MIME sniffing
- [x] PDF safety checks (page count, JS detection)
- [x] URL ingestion with SSRF protections
- [x] Storage encryption and metadata tracking
- [x] Chunk metadata schema aligned with `retrieval.md`
- [x] Tests: file validation matrix, SSRF blocklist tests, worker ingestion tests
- [x] CI/CD: add any new test fixtures or dependencies (no workflow changes needed)
Definition of done:
- [x] File and URL ingestion validated per `security.md`
- [x] Storage metadata and chunk metadata aligned to `retrieval.md`
- [x] Ingestion tests cover validation and worker flow
- [x] CI updated for new fixtures or deps

Phase 3 - Retrieval core (retrieval.md Phase 1)
- [x] Vector search (pgvector HNSW) with tenant filtering
- [x] Keyword search (TSVECTOR) with tenant filtering
- [x] Reciprocal Rank Fusion (RRF)
- [x] Context assembly and citations
- [x] Tests: unit tests for fusion/assembly, integration tests for vector and keyword search
- [x] CI/CD: add pgvector container or fixtures if needed (no workflow changes needed)
Definition of done:
- [x] Vector + keyword search implemented with tenant filtering
- [x] RRF fusion and context assembly used by retrieval pipeline
- [x] Retrieval tests cover search and fusion paths
- [x] CI updated for pgvector dependency if required

Phase 4 - Chat endpoint and conversation storage (api_spec.md)
- [x] `POST /projects/{project_id}/chat` with retrieval + LLM response
- [x] Conversation and message persistence
- [x] Token usage tracking
- [x] Tests: chat API integration, conversation storage, citations formatting
- [x] CI/CD: update env vars for LLM provider mocks if needed (no workflow changes needed)
Definition of done:
- [x] Chat endpoint returns responses with citations
- [x] Conversations and messages persisted
- [x] Token usage tracking working
- [x] Chat tests pass in CI

Phase 5 - Retrieval optimization (retrieval.md Phase 2)
- [x] Embedding cache (Redis hot cache + Postgres cold cache)
- [x] Query expansion and rewriting
- [x] Reranking (cross-encoder)
- [x] Retrieval metrics capture
- [x] Tests: cache hit/miss, reranker on/off, metrics persistence
- [x] CI/CD: add any new dependencies or model downloads (no workflow changes needed)
Definition of done:
- [x] Caching, query expansion, and reranking implemented per settings
- [x] Retrieval metrics recorded to database
- [x] Optimization tests pass and are stable
- [x] CI updated for new dependencies or model setup

Phase 6 - Widget and RUM metrics (widget_protocol.md, observability.md)
- [x] `/tokens/widget` endpoint
- [ ] Widget origin handshake and postMessage protocol
- [x] `/metrics/widget` ingestion
- [x] Tests: Playwright E2E for widget flow, RUM ingestion tests (API tests only)
- [ ] CI/CD: add Playwright setup when harness is added
Notes for frontend implementation:
- Implement the widget iframe protocol (`postMessage` handshake, resize, token refresh, toggle)
- Enforce origin validation in the iframe before processing messages
- Parent page should never call the API directly; only the iframe does
- Add Playwright E2E coverage for parent + iframe flows
Definition of done:
- [x] Widget token issuance and origin validation working
- [ ] Widget protocol implemented and tested
- [x] RUM metrics ingestion live and tested
- [ ] E2E tests documented and runnable in CI

Phase 7 - Observability and readiness (observability.md)
- [x] `/metrics` endpoint with required labels
- [x] Structured logging with standard fields
- [x] OpenTelemetry tracing for API, DB, Redis, LLM calls
- [x] `/health/ready` with DB/Redis/S3 checks
- [x] Tests: readiness probe integration, metrics endpoint smoke tests
- [x] CI/CD: add observability env vars or exporters if required (no workflow changes needed)
Definition of done:
- [x] `/metrics` and `/health/ready` implemented and tested
- [x] Structured logging and tracing active
- [x] Observability tests pass in CI
- [ ] Dashboards or exporter configs documented

Ongoing maintenance
- [ ] Keep `AGENTS.md` aligned with `.context/` and this plan
- [ ] Update tests and CI/CD whenever features or dependencies change
