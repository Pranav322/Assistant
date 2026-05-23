# Agent Guide (rag-prod)

## Deployment & Infrastructure

- **Backend**: FastAPI on DigitalOcean droplet `pranawww` at `143.110.247.23`, running via Docker Compose (`backend/docker-compose.yml`). Services: `chatbot-api` (port 8001), `chatbot-worker` (Dramatiq), `chatbot-redis`.
- **Frontend**: Next.js on Vercel at `contextly.live`. Widget iframe at `contextly.live/widget`. embed.js at `contextly.live/embed.js`.
- **Database**: External Neon PostgreSQL with pgvector (not in Docker Compose).
- **API public URL**: `https://api.pranavbuilds.tech` (Caddy reverse proxy → port 8001).
- **Deploy**: Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) SSHs into VPS and runs `docker compose down && docker compose up -d --build`. SSH key: `~/.ssh/contextly_deploy`.
- **VPS swap**: 2GB swap file at `/swapfile` (added to prevent OOM kills during ingestion).
- **Worker config**: `--processes 1 --threads 4` (reduced from 4 processes to save memory; ~300MB baseline vs 1.1GB before).

## Widget Embed (One-liner)

Customers embed the widget with just:
```html
<script src="https://contextly.live/embed.js" data-project-id="uuid" data-api-key="ctly_xxx" defer></script>
```

`embed.js` auto-calls `POST /api/v1/tokens/widget` using the API key, gets a JWT, then creates the iframe. No server-side token generation needed on the customer's side.

- CORS on `/api/v1/tokens/widget` is opened to `*` via a path-specific middleware in `backend/app/main.py` (`widget_token_cors`).
- Security is enforced by API key validation + `project.allowed_origins` check on the token endpoint.
- Customers must add their domain to **allowed origins** in the Contextly dashboard.
- After auto-fetch, normal JWT refresh cycle takes over (`/tokens/refresh` with Bearer token).

## Known Issues Fixed

- **Worker OOM kills**: Reduced to 1 process + added 2GB swap. Was 4 processes × ~200MB = 800MB baseline.
- **MissingGreenlet on ingestion failure**: `source.id` was accessed after `db.rollback()` expired the ORM object. Fixed by capturing `source_db_id = source.id` before the try block (`backend/app/services/ingestion.py`).
- **Thread-shared asyncpg engine**: With `--threads 4`, each thread runs `asyncio.run()` with its own event loop but previously shared a singleton asyncpg engine → "another operation is in progress". Fixed by creating a fresh engine per task in `backend/app/worker/tasks.py`.
- **API startup crash**: VPS `.env` had `BACKEND_CORS_ORIGINS='[...]'` with literal single quotes → Pydantic JSON parse failure. Fixed by removing quotes on VPS.

## Ingestion Worker Architecture

Dramatiq actor `process_ingestion_task` (sync) calls `asyncio.run(process_ingestion_async(...))`.
`process_ingestion_async` creates a **fresh** `create_worker_engine()` + session per call — do NOT use the singleton `WorkerAsyncSessionLocal` (causes cross-event-loop asyncpg sharing).
Engine is disposed with `await engine.dispose()` after the session context exits.



This repository is primarily specification docs for a RAG chatbot platform. This file is a living summary derived from the specs in `.context/` and can be updated.

## Project Structure

- **backend/** - Python FastAPI application (PEP 621 `pyproject.toml`, uses `uv`)
- **frontend/** - Next.js 16 application (uses `pnpm`)
- **contextly-widget/** - Standalone React widget npm package (uses `pnpm`)

## Primary Specification Files

These files define intended behavior; use them as the baseline for implementation:

- **.context/Database:** `schema.sql` (Tables, RLS policies, Indexes)
- **.context/API:** `api_spec.md` (Endpoints, Auth headers, Response formats)
- **.context/Retrieval:** `retrieval.md` (Chunking, Embedding settings)
- **.context/Security:** `security.md` (Auth, Encryption, Rate limiting)
- **.context/Observability:** `observability.md` (Metrics, Logging standards)
- **.context/Deployment:** `deployment.md` (Env vars, Docker config)
- **.context/Testing:** `testing.md` (Test strategy, CI pipeline)
- **Protocol:** `widget_protocol.md` (Iframe communication)

## Build / Lint / Test Commands

### Backend (Python)

```bash
# Install dependencies
cd backend && uv pip install -e .

# Run all tests
uv run pytest tests/ --cov=app

# Run single test file
uv run pytest tests/unit/test_chunking.py

# Run single test function
uv run pytest tests/unit/test_chunking.py::test_chunk_text_splits_correctly

# Run tests by keyword
uv run pytest -k chunking

# Lint/Format
uv run black app tests
uv run isort app tests
uv run mypy app

# Docker build
docker build -f backend/Dockerfile.api .
docker build -f backend/Dockerfile.worker .
```

### Frontend (Next.js)

```bash
cd frontend
pnpm install
pnpm dev      # Development server
pnpm build    # Production build
pnpm lint     # ESLint
```

### Contextly Widget

```bash
cd contextly-widget
pnpm install
pnpm build    # Builds JS + generates CSS
```

### Integration Tests (requires Docker)

```bash
docker-compose up -d postgres redis
uv run pytest tests/integration/
```

## Code Style Guidelines

### General
- Favor clarity and explicitness over cleverness.
- Use ASCII-only text unless file already contains Unicode.
- Keep business logic in services; keep FastAPI routes thin.

### Python
- Use type hints for public functions and core services.
- Prefer async I/O for API, DB, Redis, and external calls.
- Follow pytest naming: files `test_*.py`, functions `test_*`.
- Use fixtures in `conftest.py` for shared setup.

### Imports (Python)
- Standard library first, third-party second, local imports last.
- Keep imports sorted and grouped; use `isort`.
- Avoid unused imports.

### Naming
- Python: snake_case (functions/variables), PascalCase (classes), UPPER_SNAKE_CASE (constants)
- SQL: lowercase with underscores

### Errors & Validation
- Validate inputs early (Pydantic models or explicit checks).
- Use domain-specific exceptions; map to HTTP errors at edges.
- Never leak secrets in error messages or logs.

### Database Access
- ALWAYS include `project_id` in WHERE clauses (tenant isolation).
- Use parameterized queries to prevent SQL injection.

## Security (Non-Negotiable)

From `security.md`:
- API keys: bcrypt only; NEVER SHA-256.
- All DB queries MUST filter by `project_id` to avoid tenant leaks.
- Never store secrets in code; use environment variables.
- Origin validation for widget/iframe; no wildcard origins in production.
- JWT validation must check signature, expiry, audience, issuer, and origin.

## Logging & Observability

From `observability.md`:
- Use JSON structured logging with `structlog`.
- Log context fields: request_id, project_id, service, duration_ms, model.
- Do NOT log PII, secrets, or message contents.
- Log stack traces only on ERROR.

## When to Ask the User

- Ask if a required input is missing (API keys, endpoints, secrets).
- Ask before any destructive or irreversible action.
- Ask when a choice materially changes behavior and is not defined in specs.
- Do not guess credentials or external service details.

## Flow of Work

1. Read `.context/*` and this guide before changes.
2. Update `IMPLEMENTATION_PLAN.md` checkboxes as work is completed.
3. Always add or update tests for new behavior.
4. Update CI/CD workflows when tests, commands, or dependencies change.

## Widget Protocol Rules (Required)

- Treat `.context/widget_protocol.md` as canonical for widget messaging behavior.
- For changes in `frontend/public/embed.js`, `frontend/app/widget/*`, or `contextly-widget/*`:
  - Update protocol docs first or in the same PR.
  - Keep backward compatibility for existing embeds unless a major version migration is explicitly planned.
  - Support canonical envelope (`type`, `payload`, `requestId`, `timestamp`) and legacy flat message parsing during migration windows.
  - Prefer `project_id` as canonical query/message key; accept `projectId` legacy input where needed.

## Documentation Sync Rules

- Any behavior change to auth/token/refresh/chat/widget flow must update relevant files in `.context/` in the same change set:
  - `api_spec.md`
  - `widget_protocol.md`
  - `security.md` (if security posture changes)
  - `testing.md`
  - `observability.md` (if metrics/alerts change)

## Validation Gates For Widget Changes

- Before marking widget-related work complete, run at least:
  - backend tests impacted by auth/widget flow
  - frontend lint/build
  - contextly-widget build
- If compatibility behavior changed, add or update tests covering canonical and legacy protocol paths.
