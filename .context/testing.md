# TESTING STRATEGY
**Version:** 1.1.0
**Aligned with:** schema.sql v2.2, deployment.md v1.0.1
**Last Updated:** 2026-04-24

---

## **🎯 OVERVIEW**

The testing strategy ensures reliability across the API, retrieval pipeline, and widget integration. We prioritize **integration tests** (checking real DB/Redis interactions) over mocks for core logic.

### **Test Pyramid:**
1. **Unit Tests (40%):** Pure functions (text chunking, token validation).
2. **Integration Tests (40%):** API endpoints with real DB/Redis (Docker).
3. **E2E/Widget Tests (15%):** Browser-based verification of iframe protocol.
4. **Load Tests (5%):** Performance validation (100 users).

---

## **🧪 1. UNIT TESTING (Python)**

**Scope:** Business logic, utility functions, Pydantic validation.
**Tooling:** `pytest`
**Coverage Target:** 80%

### **Example Test Structure:**
```python
# test_chunking.py
from app.services.chunking import chunk_text

def test_chunk_text_splits_correctly():
    text = "A" * 5000
    chunks = chunk_text(text, chunk_size=1000, overlap=100)
    assert len(chunks) == 6
    assert len(chunks[0]) == 1000
```

---

## **🔗 2. INTEGRATION TESTING (API + DB)**

**Scope:** API endpoints, Database queries, Redis caching, Background jobs.
**Tooling:** `pytest`, `testcontainers` or `docker-compose.test.yml`

### **Strategy:**
- **Real Database:** Tests run against a fresh Postgres container (with pgvector).
- **Real Redis:** Tests run against a fresh Redis container.
- **Fixtures:** `conftest.py` manages DB lifecycles (create/drop per session or function).

### **Example Test:**
```python
# test_api_projects.py
async def test_create_project(async_client, db_session):
    response = await async_client.post("/projects", json={"name": "Test Project"})
    assert response.status_code == 201
    assert response.json()["id"] is not None
    
    # Verify DB
    project = await db_session.execute(select(Project).where(Project.name == "Test Project"))
    assert project is not None
```

---

## **🖥️ 3. E2E WIDGET TESTING (Browser)**

**Scope:** Iframe loading, PostMessage protocol, Origin validation, UI rendering.
**Tooling:** Playwright (Python or Node.js)

### **Key Scenarios:**
1. **Security:** Parent/Widget handshake.
   - Verify widget rejects messages from wrong origin.
   - Verify widget API calls have correct Origin header.
2. **Functionality:**
    - Open/Close toggle.
    - Send message -> Receive response.
    - Resize events.

3. **Protocol Compatibility:**
   - Canonical message envelope (`type`, `payload`, `requestId`, `timestamp`).
   - Legacy flat messages accepted during migration.
   - Query param compatibility (`project_id` canonical, `projectId` legacy).
   - Token refresh parity across script embed, hosted widget page, and React SDK.

### **Example (Playwright):**
```python
def test_widget_handshake(page):
    page.goto("http://localhost:8000/demo.html")
    iframe = page.frame_locator("#chatbot-widget")
    
    # Trigger open
    page.click("#chatbot-toggle")
    
    # Verify iframe visible & content loaded
    expect(iframe.locator("input[placeholder='Ask me...']")).to_be_visible()
```

---

## **🚀 4. LOAD TESTING**

**Scope:** API throughput, Latency under load, Database connection limits.
**Tooling:** `k6` or `Locust`

### **Scenarios:**
1. **Chat Spike:** 100 concurrent users sending messages.
2. **Ingestion:** Uploading large PDFs while chatting.

### **Benchmarks (SLO):**
- **Chat Latency:** P95 < 2s at 100 RPS.
- **Error Rate:** < 1%.

---

## **⚙️ CI/CD PIPELINE**

### **GitHub Actions Workflow:**
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: ankane/pgvector
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:alpine
    steps:
      - uses: actions/checkout@v3
      - name: Install uv
        run: pip install uv
      - name: Install dependencies
        run: uv pip install --system .
      - name: Run Unit & Integration Tests
        run: uv run pytest tests/ --cov=app
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/chatbot
          REDIS_URL: redis://localhost:6379/0
```

### **Required Merge Gates (Widget Changes):**

For PRs touching `frontend/public/embed.js`, `frontend/app/widget/*`, or `contextly-widget/*`, all must pass:

1. Unit/integration tests (`uv run pytest tests/ --cov=app`)
2. Widget protocol compatibility tests (canonical + legacy)
3. Frontend lint/build (`pnpm lint`, `pnpm build` in `frontend/`)
4. Widget package build (`pnpm build` in `contextly-widget/`)

### **Protocol Contract Matrix (Must Be Tested):**

1. `embed.js` canonical-write -> hosted widget dual-read
2. `embed.js` canonical-write -> React SDK `Chat` dual-read
3. legacy flat message -> hosted widget dual-read
4. legacy flat message -> React SDK `Chat` dual-read
5. `project_id` query param path
6. `projectId` legacy query param path

---

## **📂 DIRECTORY STRUCTURE**

```text
tests/
├── conftest.py          # Shared fixtures (DB, Client)
├── unit/
│   ├── test_chunking.py
│   └── test_security.py
├── integration/
│   ├── api/
│   │   ├── test_projects.py
│   │   └── test_chat.py
│   └── worker/
│       └── test_ingestion.py
├── e2e/
│   └── test_widget_flow.py
└── load/
    └── locustfile.py
```
