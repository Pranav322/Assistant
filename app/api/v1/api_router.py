from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    chat,
    ingestion,
    metrics,
    projects,
    tokens,
    usage,
)

api_router = APIRouter()
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(tokens.router, tags=["auth"])
api_router.include_router(metrics.router, tags=["metrics"])
api_router.include_router(projects.router, tags=["projects"])
api_router.include_router(usage.router, tags=["usage"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(auth.router, tags=["auth"])
