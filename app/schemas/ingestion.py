from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, HttpUrl


class UrlIngestRequest(BaseModel):
    url: HttpUrl


class SourceResponse(BaseModel):
    id: UUID
    project_id: UUID
    type: str
    content_hash: str
    metadata: dict = {}
    status: str
    created_at: datetime
    updated_at: datetime
