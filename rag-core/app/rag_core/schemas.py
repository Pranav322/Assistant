from typing import Any
from uuid import UUID

from pydantic import BaseModel, HttpUrl


class UrlIngestRequest(BaseModel):
    url: HttpUrl


class RetrieveRequest(BaseModel):
    project_id: UUID
    query: str
    conversation_history: list[dict[str, str]] | None = None


class RetrieveResponse(BaseModel):
    context: str
    citations: list[dict[str, Any]]
    cache_hit_rate: float
