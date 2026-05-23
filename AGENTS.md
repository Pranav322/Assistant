# Agent Guide (rag-prod)

---

## Infrastructure Overview

```
User's Browser
    │
    ├─► contextly.live  (Vercel — Next.js frontend + widget iframe)
    │       frontend/public/embed.js      ← loaded by customer sites
    │       frontend/app/widget/page.tsx  ← widget iframe content
    │
    └─► api.pranavbuilds.tech  (Caddy → Docker → FastAPI)
            │
            ├─ chatbot-api     (FastAPI, port 8001 inside container → 8001 on host)
            ├─ chatbot-worker  (Dramatiq async task worker)
            ├─ chatbot-redis   (Redis 7, broker + cache, port 6379 localhost-only)
            └─ Neon PostgreSQL (external, pgvector enabled, not in Docker)
```

---

## VPS

| Field | Value |
|---|---|
| Provider | DigitalOcean |
| Droplet name | `pranawww` |
| IP | `143.110.247.23` |
| OS | Ubuntu 24.04.3 LTS |
| RAM | 2 GB + 2 GB swap (`/swapfile`) |
| Disk | 48 GB (19 GB used) |
| SSH key | `~/.ssh/contextly_deploy` (passphrase-free deploy key) |
| Project path | `/root/Assistant` |

**SSH in:**
```bash
ssh -i ~/.ssh/contextly_deploy root@143.110.247.23
```

---

## Caddy (Reverse Proxy)

Config: `/etc/caddy/Caddyfile`
```
api.pranavbuilds.tech {
    reverse_proxy 127.0.0.1:8001
}

watch.contextly.live {
    reverse_proxy 127.0.0.1:3000
}
```
Caddy handles TLS automatically (Let's Encrypt). Systemd service: `caddy`.

**Diagnose:**
```bash
systemctl status caddy
journalctl -u caddy -n 50
```

---

## Docker Compose (Backend)

File: `/root/Assistant/backend/docker-compose.yml`

| Container | Image | Role | Port |
|---|---|---|---|
| `chatbot-redis` | `redis:7-alpine` | Message broker + cache | `127.0.0.1:6379` |
| `chatbot-api` | `backend-api` (built) | FastAPI HTTP server | `0.0.0.0:8001` |
| `chatbot-worker` | `backend-worker` (built) | Dramatiq task worker | none |

Worker runs: `dramatiq app.worker app.worker.tasks --processes 1 --threads 4`
(`--processes 1` critical — 4 processes each load ML stack, exceeds 2 GB RAM)

**Common commands:**
```bash
cd /root/Assistant/backend

docker compose ps                    # container status
docker compose logs chatbot-api -f   # live API logs
docker compose logs chatbot-worker -f # live worker logs
docker stats --no-stream             # memory per container
docker compose down && docker compose up -d --build  # full redeploy
docker compose restart api           # restart just API
```

**Env file:** `/root/Assistant/backend/.env` (gitignored, must be managed manually on VPS)

---

## Deploy Pipeline

```
git push origin main
    │
    └─► GitHub Actions (.github/workflows/deploy.yml)
            triggers on: push to main with backend/** changes OR workflow_dispatch
            runner: ubuntu-latest
            environment: deploy-ssh
            │
            └─► appleboy/ssh-action@v1.0.3
                    secrets: VPS_HOST, VPS_USERNAME (root), VPS_SSH_KEY, VPS_PROJECT_PATH
                    script:
                        cd $VPS_PROJECT_PATH/backend
                        git pull origin main
                        docker compose down
                        docker compose up -d --build
```

**Frontend deploy:** Vercel auto-deploys on push to `main` — no config needed.

**Check deploy status:**
```bash
gh run list --limit 5
gh run view <run-id> --log-failed
```

**GitHub secrets to verify if deploy breaks:**
```bash
gh secret list --env deploy-ssh
# Required: VPS_HOST=143.110.247.23, VPS_USERNAME=root, VPS_SSH_KEY, VPS_PROJECT_PATH=/root/Assistant
```

---

## Tech Stack

### Backend (`backend/`)
| Layer | Tech |
|---|---|
| Language | Python 3.11 |
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2 async (asyncpg driver) |
| DB | Neon PostgreSQL + pgvector |
| Cache/Broker | Redis 7 |
| Task queue | Dramatiq |
| LLM | Azure OpenAI (`gpt-4` via `AZURE_DEPLOYMENT_NAME`) |
| Embeddings | Azure OpenAI (`text-embedding-3-small`) |
| Auth | Firebase Admin SDK (user auth) + bcrypt API keys + JWT widget tokens |
| Package manager | `uv` (pyproject.toml / uv.lock) |
| Linter/Formatter | Black + isort |

### Frontend (`frontend/`)
| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel |
| Widget embed | `frontend/public/embed.js` (vanilla JS, creates iframe) |
| Widget UI | `frontend/app/widget/page.tsx` (iframe content, React) |
| Package manager | pnpm |

### Deprecated
- `contextly-widget/` — React SDK, frozen. Do not maintain. iframe-only is canonical.

---

## Required `.env` on VPS

```
DATABASE_URL=postgresql+asyncpg://...         # Neon connection string
REDIS_URL=redis://redis:6379/0
JWT_SECRET=...
ENVIRONMENT=production
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://....openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-05-15
AZURE_DEPLOYMENT_NAME=...                     # e.g. gpt-4
AZURE_EMBEDDING_DEPLOYMENT_NAME=...
BACKEND_CORS_ORIGINS=["https://contextly.live","https://www.contextly.live","http://localhost:3000"]
WIDGET_PUBLIC_ORIGIN=https://contextly.live
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
```

⚠️ **Do NOT wrap values in single quotes** — Docker passes them literally, breaking Pydantic JSON parsing.

---

## Diagnosing Issues

### API down / 502
```bash
ssh -i ~/.ssh/contextly_deploy root@143.110.247.23
docker compose -f /root/Assistant/backend/docker-compose.yml ps
docker logs chatbot-api --tail 50
# Common causes:
# 1. .env has bad formatting (single-quoted JSON values → Pydantic parse error)
# 2. DB connection failed (check DATABASE_URL, Neon dashboard)
# 3. Containers stopped — run: docker compose up -d
```

### Worker not processing ingestion jobs
```bash
docker logs chatbot-worker --tail 80
# Common errors:
# "another operation is in progress" → asyncpg engine shared across threads
#   Fix: ensure tasks.py uses create_worker_engine() per call, NOT WorkerAsyncSessionLocal singleton
# "MissingGreenlet" → ORM object accessed after rollback
#   Fix: capture source.id before try block
# "Retries exceeded" → check dead letter table in DB
# Worker OOM-killed (exit code -9) → check: dmesg | grep -i oom
#   Fix: docker compose -f ... restart worker (swap is enabled, should recover)
```

### OOM / memory issues
```bash
free -h                     # check swap usage
docker stats --no-stream    # per-container memory
dmesg | grep -i "oom\|killed process" | tail -10
# Swap: /swapfile (2GB) — persistent across reboots (in /etc/fstab)
# If worker baseline > 400MB something is leaking
```

### Deploy not triggering
```bash
gh run list --limit 5
# Check: did push include backend/** changes? Deploy only triggers on those paths.
# Force trigger: gh workflow run deploy.yml
```

### CORS errors on customer sites
```bash
# POST /api/v1/tokens/widget is open to * via widget_token_cors middleware in main.py
# Other endpoints require origin in BACKEND_CORS_ORIGINS
# If customer gets 403 on token fetch: their domain not in project.allowed_origins
```

---

## Widget Embed Flow

**Customer drops this on their site:**
```html
<script src="https://contextly.live/embed.js" data-project-id="uuid" data-api-key="ctly_xxx" defer></script>
```

**What happens:**
1. `embed.js` reads `data-api-key` + `data-project-id`
2. Calls `POST https://api.pranavbuilds.tech/api/v1/tokens/widget` with `X-API-Key` header
3. Backend validates key, checks `window.location.origin` against `project.allowed_origins`
4. Returns short-lived JWT (24h)
5. `embed.js` creates `<iframe src="https://contextly.live/widget?token=...">` 
6. Sends `chatbot:init` postMessage to iframe with token + projectId
7. Widget renders chat UI, user messages go to `POST /api/v1/chat`
8. Token auto-refreshes 5min before expiry via `POST /api/v1/tokens/refresh`

**Customer must add their domain to allowed origins in the Contextly dashboard.**

---

## Ingestion Worker Architecture

```
API receives file upload
    │
    └─► enqueues Dramatiq message on Redis "ingestion" queue
            │
            └─► chatbot-worker picks it up
                    process_ingestion_task() [sync Dramatiq actor]
                        └─► asyncio.run(process_ingestion_async())
                                │
                                ├─ creates fresh engine via create_worker_engine()
                                ├─ fetches file from storage / URL
                                ├─ IngestionService.process_file()
                                │     ├─ extract text (PDF/HTML/text)
                                │     ├─ chunk text
                                │     ├─ generate embeddings (Azure OpenAI)
                                │     ├─ store chunks + embeddings in Neon DB
                                │     └─ mark source.status = "completed"
                                └─ disposes engine (await engine.dispose())
```

⚠️ **NEVER use `WorkerAsyncSessionLocal` singleton in tasks** — it shares one asyncpg engine across threads with different event loops → "another operation is in progress" error. Always call `create_worker_engine()` directly per task.



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
