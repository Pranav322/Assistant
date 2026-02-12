from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ProcessedChunk(BaseModel):
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Optionally map to DB ID if already exists
    id: Optional[Any] = None
