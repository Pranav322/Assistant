from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class ProcessedChunk(BaseModel):
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Optionally map to DB ID if already exists
    id: Optional[Any] = None
