from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models import WidgetMetric
from app.schemas.widget import WidgetMetricsRequest

router = APIRouter()


@router.post("/metrics/widget", status_code=status.HTTP_202_ACCEPTED)
async def ingest_widget_metrics(
    payload: WidgetMetricsRequest,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.widget_token_required("widget_metrics")),
):
    for item in payload.metrics:
        metric = WidgetMetric(
            project_id=auth.project_id,
            name=item.name,
            value=item.value,
            tags=item.tags or {},
        )
        db.add(metric)

    await db.commit()
    return {"status": "accepted"}
