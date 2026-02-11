from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ApiKeyCreate(BaseModel):
    name: Optional[str] = None
    scopes: Optional[List[str]] = None
    allowed_origins: Optional[List[str]] = None
    rate_limit: Optional[Dict[str, Any]] = None
    usage_limit: Optional[Dict[str, Any]] = None


class ApiKeyResponse(BaseModel):
    id: str
    name: Optional[str]
    scopes: List[str]
    allowed_origins: List[str]
    rate_limit: Dict[str, Any]
    usage_limit: Dict[str, Any]
    expires_at: Optional[str]
    revoked_at: Optional[str]
    prefix: Optional[str] = None
    api_key: Optional[str] = None
