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
    └─► api.contextly.live  (Caddy → Docker → FastAPI)
            │
            ├─ chatbot-api     (FastAPI, port 8001 on host → 8000 in container)
            ├─ chatbot-worker  (Dramatiq async task worker)
            ├─ chatbot-redis   (Redis 7, broker + cache, port 6379 localhost-only)
            └─ Neon PostgreSQL (external, ap-southeast-1 / Singapore, pgvector enabled, not in Docker)
```

---

## VPS

**Migrated from DigitalOcean to Azure (2026-08-14).** The DigitalOcean droplet (`pranawww`) was destroyed. A first Azure VM (`deepdoc-fix-vm`, `eastus`/Virginia) was also provisioned and is now **deallocated** (stopped, not deleted) after being replaced — it put the backend ~250-300ms further from the Neon DB (Singapore) than the old droplet ever was, causing slow logins/`/projects` loads. Current VM below fixes that.

| Field | Value |
|---|---|
| Provider | Azure |
| VM name | `latency-test-vm-in` |
| Resource group | `latency-test-vm-in_group` |
| Region | Central India (Pune) — chosen for proximity to Neon DB (`ap-southeast-1`) and to users |
| IP | `20.192.11.41` |
| Size | `Standard_D2s_v5` (2 vCPU, 8 GB RAM) |
| Disk | 29 GB (~8 GB used) |
| OS | Ubuntu 24.04 LTS |
| SSH key | `~/Downloads/deepdoc-fix-vm_key.pem` (user `azureuser`, no passphrase) |
| Project path | `/opt/Assistant` |

**SSH in:**
```bash
ssh -i ~/Downloads/deepdoc-fix-vm_key.pem azureuser@20.192.11.41
```

**Deallocated standby VM** (`deepdoc-fix-vm`, `eastus`, `DEEPDOC-FIX-VM_GROUP`, IP `20.127.165.189`): kept as a fallback, not deleted yet. Safe to delete once the Central India VM has run stable for a while.

**Azure OpenAI**: also recreated fresh (the prior deployment was destroyed alongside DigitalOcean). Chat model is `gpt-5-mini` (reasoning model — requires `max_completion_tokens` not `max_tokens`, and only supports default `temperature=1`; see `app/services/retrieval.py`). Embedding model is `text-embedding-3-small` (1536 dims, matches `schema.sql`/`retrieval.md`).

---

## Caddy (Reverse Proxy)

Config: `/etc/caddy/Caddyfile`
```
api.contextly.live {
    reverse_proxy 127.0.0.1:8001
}
```
Caddy handles TLS automatically (Let's Encrypt). Systemd service: `caddy`.

⚠️ `watch.contextly.live` DNS points here too but has **no Caddy block yet** — Grafana/Prometheus (`backend/docker-compose.observability.yml`, Grafana on host port `3001`, default `admin`/`admin`) were never brought up on this VM. Deferred; add a `watch.contextly.live { reverse_proxy 127.0.0.1:3001 }` block and `docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d` when observability is prioritized. Change the Grafana password before exposing it publicly.

**Diagnose:**
```bash
systemctl status caddy
journalctl -u caddy -n 50
```

---

## Docker Compose (Backend)

File: `/opt/Assistant/backend/docker-compose.yml`

| Container | Image | Role | Port |
|---|---|---|---|
| `chatbot-redis` | `redis:7-alpine` | Message broker + cache | `127.0.0.1:6379` |
| `chatbot-api` | `backend-api` (built) | FastAPI HTTP server | `0.0.0.0:8001` |
| `chatbot-worker` | `backend-worker` (built) | Dramatiq task worker | none |

Worker runs: `dramatiq app.worker app.worker.tasks --processes 1 --threads 4`
(`--processes 1` critical — 4 processes each load ML stack, exceeds 2 GB RAM)

**Common commands:**
```bash
cd /opt/Assistant/backend

sudo docker compose ps                    # container status
sudo docker compose logs chatbot-api -f   # live API logs
sudo docker compose logs chatbot-worker -f # live worker logs
sudo docker stats --no-stream             # memory per container
sudo docker compose up -d --build         # rebuild + redeploy (no down needed)
sudo docker compose restart api           # restart just API
```

**Env file:** `/opt/Assistant/backend/.env` (gitignored, must be managed manually on VPS)

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
                    secrets: VPS_HOST, VPS_USERNAME (azureuser), VPS_SSH_KEY, VPS_PROJECT_PATH
                    script (hardened 2026-08-14 — set -euo pipefail, fetch+reset instead of pull,
                            real post-deploy health check against /health, fails loudly + prints
                            container logs instead of silently reporting success on a bad deploy):
                        set -euo pipefail
                        cd $VPS_PROJECT_PATH/backend
                        git fetch origin main
                        git reset --hard origin/main
                        docker compose up -d --build
                        # polls http://127.0.0.1:8001/health for ~30s, exits 1 with logs if unhealthy
```

**Frontend deploy:** Vercel auto-deploys on push to `main` — no config needed (any push to `main` triggers it, not path-filtered like the backend one).

**Check deploy status:**
```bash
gh run list --limit 5
gh run view <run-id> --log-failed
```

**GitHub secrets to verify if deploy breaks:**
```bash
gh secret list --env deploy-ssh
# Required: VPS_HOST=20.192.11.41, VPS_USERNAME=azureuser, VPS_SSH_KEY, VPS_PROJECT_PATH=/opt/Assistant
```

---

## Tech Stack

### Backend (`backend/`)
| Layer | Tech |
|---|---|
| Language | Python 3.11 |
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2 async (asyncpg driver) |
| DB | Neon PostgreSQL + pgvector (`ap-southeast-1`, external, not on Azure) |
| Cache/Broker | Redis 7 |
| Task queue | Dramatiq |
| LLM | Azure OpenAI (`gpt-5-mini` via `AZURE_DEPLOYMENT_NAME`) |
| Embeddings | Azure OpenAI (`text-embedding-3-small`, 1536 dims) |
| Auth | Firebase Admin SDK (user auth) + bcrypt API keys + JWT widget tokens |
| Package manager | `uv` (pyproject.toml / uv.lock) |
| Linter/Formatter | Black + isort |

### Frontend (`frontend/`)
| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Hosting | Vercel |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui + Radix |
| Animations | framer-motion |
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
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_DEPLOYMENT_NAME=gpt-5-mini
AZURE_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-small
AZURE_EMBEDDING_API_KEY=...
AZURE_EMBEDDING_ENDPOINT=https://....services.ai.azure.com
AZURE_EMBEDDING_API_VERSION=2024-12-01-preview
BACKEND_CORS_ORIGINS=["https://contextly.live","https://www.contextly.live","http://localhost:3000"]
WIDGET_PUBLIC_ORIGIN=https://contextly.live
```

⚠️ **Do NOT wrap values in single quotes** — Docker passes them literally, breaking Pydantic JSON parsing.

⚠️ **Firebase credentials filename**: `FIREBASE_CREDENTIALS_PATH` is *not actually set* in the real `.env`. `app/core/config.py`'s default is the literal filename `contextly-86e4d-firebase-adminsdk-fbsvc-ee1a051661.json`, expected at `/app/<that name>` inside the container (`Dockerfile.api` does `COPY . .` from `backend/`, so the JSON file must exist under `backend/` with that exact name at build time). Renaming it (e.g. to `firebase-credentials.json`) without also setting `FIREBASE_CREDENTIALS_PATH` breaks Firebase Admin SDK init silently (auth still returns 200, but every request logs "Firebase initialization skipped or failed").

⚠️ **DB engine settings** (`app/api/deps.py`): `pool_pre_ping` and `echo` are `False` (as of 2026-08-14) — `pool_pre_ping=True` forces an extra network round trip before every query, which is expensive given the DB isn't co-located with the VM (see VPS section). Don't re-enable without a reason; workers already ran fine without it (`app/worker/db.py`).

⚠️ **JWT_SECRET**: rotated 2026-08-14 off the old dev placeholder value. If you need to rotate again, all existing sessions/widget tokens invalidate immediately — widget tokens auto-refresh so they self-heal fast, user sessions require re-login.

---

## Diagnosing Issues

### API down / 502
```bash
ssh -i ~/Downloads/deepdoc-fix-vm_key.pem azureuser@20.192.11.41
sudo docker compose -f /opt/Assistant/backend/docker-compose.yml ps
sudo docker logs chatbot-api --tail 50
# Common causes:
# 1. .env has bad formatting (single-quoted JSON values → Pydantic parse error)
# 2. DB connection failed (check DATABASE_URL, Neon dashboard)
# 3. Containers stopped — run: docker compose up -d
```

### Worker not processing ingestion jobs
```bash
sudo docker logs chatbot-worker --tail 80
# Common errors:
# "another operation is in progress" → asyncpg engine shared across threads
#   Fix: ensure tasks.py uses create_worker_engine() per call, NOT WorkerAsyncSessionLocal singleton
# "MissingGreenlet" → ORM object accessed after rollback
#   Fix: capture source.id before try block
# "Retries exceeded" → check dead letter table in DB
# Worker OOM-killed (exit code -9) → check: dmesg | grep -i oom
#   Fix: sudo docker compose -f ... restart worker
```

### OOM / memory issues
```bash
free -h                     # check memory usage
sudo docker stats --no-stream    # per-container memory
dmesg | grep -i "oom\|killed process" | tail -10
# No swapfile configured on this VM (Standard_D2s_v5, 8GB RAM) — the old
# DigitalOcean droplet needed a 2GB swapfile because it only had 2GB RAM.
# Add one if memory pressure shows up here.
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
2. Calls `POST https://api.contextly.live/api/v1/tokens/widget` with `X-API-Key` header
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
