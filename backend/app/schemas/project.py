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


class ProjectConfigResponse(BaseModel):
    id: str
    name: str
    title: str
    primary_color: str
    welcome_message: str
    starter_questions: List[str]
    logo_url: Optional[str] = None
