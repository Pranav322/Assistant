# Agent Guide (rag-prod)

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
