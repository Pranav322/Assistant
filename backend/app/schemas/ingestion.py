from datetime import datetime
from typing import Optional
from uuid import UUID

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
    progress: dict = {}
    created_at: datetime
    updated_at: datetime
