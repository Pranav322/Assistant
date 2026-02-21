from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def create_worker_engine():
    return create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=False,
        pool_recycle=300,
    )


def create_worker_session_factory(engine):
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


_worker_engine = None
_worker_session_factory = None


def get_worker_session_factory():
    global _worker_engine, _worker_session_factory
    if _worker_session_factory is None:
        _worker_engine = create_worker_engine()
        _worker_session_factory = create_worker_session_factory(_worker_engine)
    return _worker_session_factory


WorkerAsyncSessionLocal = get_worker_session_factory
