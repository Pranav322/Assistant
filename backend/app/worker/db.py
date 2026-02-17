"""
Worker-specific database session management.

This module provides a database session factory specifically for Dramatiq workers
that avoids the MissingGreenlet error by:
1. Not using pool_pre_ping (avoids greenlet context issues)
2. Creating engines on-demand within async context
3. Being isolated from the API's session factory

The MissingGreenlet error occurs because:
- SQLAlchemy's pool_pre_ping feature uses greenlet_spawn internally
- Dramatiq workers run in threads without greenlet context
- When pool_pre_ping tries to ping connections, it fails

Solution: Workers use this module with pool_pre_ping=False
while the API continues to use app.api.deps with pool_pre_ping=True
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def create_worker_engine():
    """
    Create an async engine for workers WITHOUT pool_pre_ping.

    This avoids the MissingGreenlet error that occurs in Dramatiq workers
    when pool_pre_ping tries to ping connections without greenlet context.
    """
    return create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=False,  # Disabled to avoid MissingGreenlet in workers
        pool_recycle=300,
    )


def create_worker_session_factory(engine):
    """Create a session factory for workers."""
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@asynccontextmanager
async def get_worker_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for worker database sessions.

    Usage:
        async with get_worker_db() as db:
            result = await db.execute(...)

    This is safer than the global AsyncSessionLocal for workers because:
    1. Engine is created fresh each time (no stale connections)
    2. pool_pre_ping is disabled (no greenlet issues)
    3. Proper cleanup on context exit
    """
    engine = create_worker_engine()
    session_factory = create_worker_session_factory(engine)

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
            await engine.dispose()


# Legacy support: Create a simple session factory for backward compatibility
# Note: This should be used within async context only
_worker_engine = None
_worker_session_factory = None


def get_worker_session_factory():
    """
    Get or create the worker session factory.

    This uses lazy initialization to avoid creating the engine at import time.
    """
    global _worker_engine, _worker_session_factory

    if _worker_session_factory is None:
        _worker_engine = create_worker_engine()
        _worker_session_factory = create_worker_session_factory(_worker_engine)

    return _worker_session_factory


# Export for use in worker tasks
WorkerAsyncSessionLocal = get_worker_session_factory
