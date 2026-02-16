from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class WidgetTokenRequest(BaseModel):
    origin: str
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
