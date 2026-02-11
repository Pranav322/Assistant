from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any


class WidgetTokenRequest(BaseModel):
    origin: HttpUrl
    project_id: str


class WidgetTokenResponse(BaseModel):
    token: str
    expires_in: int


class WidgetMetricItem(BaseModel):
    name: str
    value: float
    tags: Optional[Dict[str, Any]] = None


class WidgetMetricsRequest(BaseModel):
    metrics: List[WidgetMetricItem]
