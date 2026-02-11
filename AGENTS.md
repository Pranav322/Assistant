# Agent Guide for rag-prod
# Purpose: help agentic coding tools work safely and consistently.

## Repository reality check
- This repo currently contains specification docs and a database schema only.
- No application source code or build system files are present.
- Do not invent commands or files; use only what exists in repo.

## Source-of-truth documents
- `security.md` defines non-negotiable security rules.
- `schema.sql` defines the production database schema and cron jobs.
- `api_spec.md` defines the API surface and error contract.
- `retrieval.md` defines the RAG retrieval pipeline behavior.
- `observability.md` defines metrics, logs, and tracing expectations.
- `widget_protocol.md` defines iframe postMessage protocol details.
- `deployment.md` describes production deployment intent.

## Build, lint, and test commands
Not found in this repository:
- No `package.json`, `pyproject.toml`, `requirements.txt`, `Makefile`, or CI config.
- No test runner configuration or scripts.

Documented but not present as files in the repo:
- `deployment.md` references `docker-compose.*.yml`, `Dockerfile.api`,
  `Dockerfile.worker`, and `docker-compose.test.yml`.
- Treat these as design intent, not runnable commands here.

If you add implementation code later, update this section with real commands.
Suggested single-test patterns (only after tools exist):
- Python pytest: `pytest path/to/test_file.py::test_name`
- JavaScript test: `npm test -- path/to/test_file.test.js`

## Code style and conventions (from specs)
General
- Prefer explicitness over magic; security and multi-tenant isolation are core.
- Keep implementations aligned with the specs above; deviations must be justified.
- Avoid unnecessary comments; only explain non-obvious logic.

Python
- Use `snake_case` for functions/variables and `PascalCase` for classes.
- Type hints are expected in examples; keep them in new code.
- Use `async`/`await` for I/O paths (FastAPI, DB, Redis) per examples.
- Handle errors with structured exceptions and explicit error codes.
- Use `structlog`-style structured logging if logging is introduced.

SQL
- Schema is authoritative; do not change column names casually.
- Use explicit `WHERE project_id = :project_id` in all queries.
- Prefer parameterized queries; avoid string interpolation in SQL.
- Keep extensions and indexes aligned with `schema.sql`.

JavaScript (widget / browser)
- Use `camelCase` for variables and functions, `PascalCase` for classes.
- Validate `postMessage` origin, payload shape, and timestamps.
- Keep payloads under size limits (10KB) and avoid blocking UI threads.

API and JSON
- Requests/responses use `snake_case` in JSON fields.
- Error responses must follow the `api_spec.md` structure:
  `error.code`, `error.message`, `error.details`, `error.request_id`,
  `error.timestamp`.
- Include `X-Request-ID` in responses and propagate it in logs.

## Security rules (must follow)
- API keys: bcrypt only, never SHA-256 (`security.md`).
- All data access queries must filter by `project_id`.
- Never store secrets in code; use environment variables.
- Enforce origin validation for widget and API tokens.
- Redact sensitive fields in logs and audit records.

## Error handling expectations
- Prefer deterministic, typed error codes from `api_spec.md`.
- For background jobs, record failures with enough context for retries.
- Avoid leaking internal details in client-facing errors.

## Observability expectations
- Metrics: use Prometheus naming and labels as in `observability.md`.
- Logs: structured JSON logs with context fields (service, env, version).
- Tracing: OpenTelemetry spans around key operations (ingest, retrieve, LLM).

## Data access and multi-tenancy
- Treat `project_id` as mandatory for every query and join.
- Use tenant-aware indexes from `schema.sql` (project_id + tsvector, HNSW).
- PgBouncer transaction pooling is assumed; do not rely on session vars.

## Retrieval pipeline guidelines
- Follow stages in `retrieval.md`: query processing, hybrid search, RRF, rerank.
- Keep defaults aligned (chunk_size 384, overlap 58) unless specified.
- Cache embedding lookups with Redis hot cache and Postgres cold cache.

## Widget protocol guidelines
- Enforce handshake, ACKs, and message format per `widget_protocol.md`.
- Only accept messages from validated origins.
- Use UUID request IDs and ISO-8601 timestamps.

## Deployment intent (not local commands)
- Containers: API server (FastAPI) and workers (Dramatiq).
- Services: Postgres + pgvector, Redis, Nginx, Prometheus/Grafana.
- Health endpoints: `/health` and `/metrics` must remain lightweight.

## Cursor/Copilot rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found.
- If such files are added later, include them here verbatim.

## When updating this file
- Keep this guide close to 150 lines for agent readability.
- Prefer accurate statements over speculation.
- Update build/test commands immediately when real configs are added.
