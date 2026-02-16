from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    stream: bool = False


class ChatResponse(BaseModel):
    response: str
    citations: List[Dict[str, Any]]
    conversation_id: Optional[str] = None
