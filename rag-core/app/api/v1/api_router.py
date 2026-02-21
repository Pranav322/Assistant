from fastapi import APIRouter

from app.api.v1.endpoints.rag_core import router as rag_core_router

api_router = APIRouter()
api_router.include_router(rag_core_router)
