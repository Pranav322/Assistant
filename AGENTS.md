# Agent Guide (rag-prod)

This repository is primarily specification docs for a RAG chatbot platform.
This file is a living summary derived from the specs below and can be updated.

## Primary Specification Files
These files define the intended behavior of the system. Use them as the baseline
for implementation decisions and update this guide if the specs change:

- **.context/Database:** `schema.sql` (Tables, RLS policies, Indexes)
- **.context/API:** `api_spec.md` (Endpoints, Auth headers, Response formats)
- **.context/Retrieval:** `retrieval.md` (Chunking, Embedding settings, Hybrid search logic)
- **.context/Security:** `security.md` (Auth, Encryption, Rate limiting matches)
- **.context/Observability:** `observability.md` (Metrics, Logging standards)
- **.context/Deployment:** `deployment.md` (Env vars, Docker config)
- **Protocol:** `widget_protocol.md` (Iframe communication)
- **Cost:** `cost.md` (Resource usage limits)
- **Testing:** `testing.md` (Test strategy)

If a rule is in one of the above files, prefer it over this summary.

## Quick Facts
- Language focus: Python 3.11 (FastAPI-style), SQL (Postgres/pgvector), Docker.
- Testing framework: pytest.
- Package manager: `uv` (PEP 621 compliant `pyproject.toml`).
- Use `uv` for all dependency management and virtual environment creation.

If new tooling is added, update this file to match it.

## Flow of Work
- Read `.context/*`, this guide, and `IMPLEMENTATION_PLAN.md` before changes.
- Update `IMPLEMENTATION_PLAN.md` checkboxes as work is completed.
- Always add or update tests for new behavior.
- Update CI/CD workflows when tests, commands, or dependencies change.
- Keep changes aligned with the specs and document any new tooling here.

## When to Ask the User
- Ask if a required input is missing (API keys, endpoints, domains, secrets, rate limits).
- Ask before any destructive or irreversible action.
- Ask when a choice materially changes behavior and is not defined in `.context/*`.
- Do not guess credentials or external service details.

## Build / Lint / Test Commands

### Build
- **Docker:**
  - `docker-compose build`
  - `docker build -f Dockerfile.api .`
  - `docker build -f Dockerfile.worker .`
- **Local:**
  - `uv pip install -e .`

### Lint / Format
- **Black:** `uv run black app tests`
- **Isort:** `uv run isort app tests`
- **Mypy:** `uv run mypy app`

### Tests (Primary)
- Run all tests:
  - `uv run pytest tests/ --cov=app`
- Run a single test file:
  - `uv run pytest tests/unit/test_chunking.py`
- Run a single test function:
  - `uv run pytest tests/unit/test_chunking.py::test_chunk_text_splits_correctly`
- Run tests by keyword:
  - `uv run pytest -k chunking`

### Tests (Integration / Containers)
- Run integration tests (requires Docker services up):
  - `docker-compose up -d postgres redis`
  - `uv run pytest tests/integration/`

### E2E / Widget
- Playwright is referenced for widget E2E testing (Python or Node). Command not
  specified in repo docs; add it when a test harness is created.

### Load Testing
- Load testing tools mentioned: `k6` or `Locust` (no concrete commands).

## Repository-Specific Rules

### Security (Non-Negotiable)
From `security.md`:
- API keys: bcrypt only; NEVER SHA-256.
- All DB queries MUST filter by `project_id` to avoid tenant leaks.
- Never store secrets in code; use environment variables.
- Origin validation for widget/iframe; no wildcard origins in production.
- CSP headers must be generated from allowed origins.

### Logging & Observability
From `observability.md`:
- Use JSON structured logging with `structlog`.
- Log context fields (request_id, project_id, service, duration_ms, model).
- Do NOT log PII, secrets, or message contents.
- Log stack traces only on ERROR.

### Data Handling
- Treat uploaded files, URLs, and parsed content as untrusted input.
- Enforce size/type/SSRF protections (see `security.md`).

## Code Style Guidelines

### General
- Keep implementations aligned with the specs in:
  - `testing.md`, `security.md`, `retrieval.md`, `observability.md`,
    `deployment.md`, and `api_spec.md`.
- Favor clarity and explicitness over cleverness.
- Use ASCII-only text unless the file already contains Unicode.

### Python
- Use type hints for public functions and core services.
- Prefer async I/O for API, DB, Redis, and external calls.
- Keep business logic in services; keep FastAPI routes thin.
- Follow pytest naming conventions:
  - Files: `test_*.py`
  - Functions: `test_*`
- Use fixtures in `conftest.py` for shared setup (DB, Redis, clients).

### Imports
- Standard library first, third-party second, local imports last.
- Keep imports sorted and grouped; avoid unused imports.

### Formatting
- Use consistent, readable formatting; keep lines reasonable in length.
- Prefer explicit keyword arguments for clarity in public APIs.

### Naming
- snake_case for Python functions/variables.
- PascalCase for classes.
- UPPER_SNAKE_CASE for module-level constants.
- SQL tables and columns: lowercase with underscores.

### Errors & Validation
- Validate inputs early (Pydantic models or explicit checks).
- Use domain-specific exceptions where helpful; map to HTTP errors at edges.
- Never leak secrets in error messages or logs.

### Database Access
- Always include `project_id` in WHERE clauses (tenant isolation).
- Avoid reliance on connection-scoped variables due to PgBouncer pooling.
- Use parameterized queries to prevent SQL injection.

### Caching
- Embedding and response caches should have explicit TTLs.
- Prefer Redis hot cache + Postgres cold cache pattern per spec.

### Security-Sensitive Code
- JWT validation must check signature, expiry, audience, issuer, and origin.
- API key verification must use bcrypt.compare/checkpw.
- Never use wildcard origins in production.

## Documentation Sources (Truth)
- `testing.md` for test strategy and CI example.
- `deployment.md` for docker-compose and runtime setup.
- `security.md` for mandatory security rules.
- `retrieval.md` for pipeline design and config defaults.
- `observability.md` for logging/metrics/tracing standards.
- `api_spec.md` for endpoint behavior and payloads.
- `widget_protocol.md` for widget messaging and origin validation.
- `docs/observability.md` for monitoring setup.

## When Adding New Tooling
- Update this file with exact build/lint/test commands.
- Note how to run a single test for each test framework.
- Record any formatter/linter rules that affect style.
