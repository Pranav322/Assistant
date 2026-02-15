from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    owner_id: Optional[str] = None
    name: str
    allowed_origins: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
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
