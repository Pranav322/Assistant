# RAG Core

Standalone FastAPI service for ingestion and retrieval only.

## Endpoints

- `POST /api/v1/ingest/upload?project_id=<uuid>`
- `POST /api/v1/ingest/url?project_id=<uuid>`
- `GET /api/v1/ingest/{source_id}?project_id=<uuid>`
- `POST /api/v1/retrieve`

## Run

```bash
uv pip install -e .
uv run uvicorn app.main:app --reload --port 8010
```
