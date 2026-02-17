# Fix for MissingGreenlet Error in Dramatiq Workers

## Problem

Production VPS was experiencing `MissingGreenlet` errors in Dramatiq workers:

```
sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called; 
can't call await_only() here. Was IO attempted in an unexpected place?
[2026-02-17 11:35:16,800] Retries exceeded for message '238d77a0-2985-4ae4-a6a0-e80be76f3664'.
```

### Root Cause
- SQLAlchemy engine was created at module import time with `pool_pre_ping=True`
- `pool_pre_ping` uses `greenlet_spawn` internally for connection health checks
- Dramatiq workers run in threads without greenlet context initialized
- When workers tried to use database connections, the ping operation failed
- Tasks kept retrying and eventually exceeded max retries

## Solution

Created worker-specific database session management that avoids the greenlet issue:

### 1. New File: `backend/app/worker/db.py`
- Provides `create_worker_engine()` - creates engine WITHOUT `pool_pre_ping`
- Provides `get_worker_db()` - context manager for safe session handling
- Provides `WorkerAsyncSessionLocal` - factory function for worker sessions

### 2. Updated: `backend/app/worker/tasks.py`
- Changed import from `AsyncSessionLocal` to `WorkerAsyncSessionLocal`
- Updated `process_ingestion_async()` to use worker-specific session factory

## Key Changes

```python
# Before (in tasks.py):
from app.api.deps import AsyncSessionLocal  # Has pool_pre_ping=True

async with AsyncSessionLocal() as db:
    ...

# After (in tasks.py):
from app.worker.db import WorkerAsyncSessionLocal  # No pool_pre_ping

session_factory = WorkerAsyncSessionLocal()
async with session_factory() as db:
    ...
```

## Test Coverage

Created comprehensive tests in `backend/tests/test_worker_greenlet_issue.py`:

1. **`test_dramatiq_worker_reproduces_greenlet_error`** - Reproduces the original issue
2. **`test_pdf_ingestion_completes_without_restart`** - Verifies PDF processing works
3. **`test_url_fetch_failure_handling`** - Tests URL fetch error handling
4. **`test_worker_with_correct_async_engine_succeeds`** - Verifies the fix works
5. **`test_dramatiq_retries_exceeded_scenario`** - Tests retry exhaustion

All tests pass confirming:
- The MissingGreenlet error is resolved
- PDF ingestion completes without requiring restart
- URL fetching failures are handled gracefully

## Deployment Notes

1. No database migrations required
2. No configuration changes needed
3. API routes continue to use `pool_pre_ping=True` (safe in FastAPI context)
4. Workers now use `pool_pre_ping=False` (avoids greenlet issue)
5. Deploy new worker container with updated code

## Verification

Run tests to verify the fix:
```bash
cd backend
export $(grep -v '^#' .env | xargs)
export PYTHONPATH=/path/to/backend
uv run pytest tests/test_worker_greenlet_issue.py -v
```

All 5 tests should pass.
