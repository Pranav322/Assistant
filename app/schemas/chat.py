from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    stream: bool = False


class ChatResponse(BaseModel):
    response: str
    citations: List[Dict[str, Any]]
    conversation_id: Optional[str] = None
