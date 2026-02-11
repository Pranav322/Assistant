from fastapi import APIRouter
from app.api.v1.endpoints import ingestion, chat

api_router = APIRouter()
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
api_router.include_router(chat.router, tags=["chat"])
