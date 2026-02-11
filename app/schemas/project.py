from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ProjectCreate(BaseModel):
    owner_id: str
    name: str
    allowed_origins: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    allowed_origins: List[str]
    settings: Dict[str, Any]
    usage: Dict[str, Any]
    is_active: bool
