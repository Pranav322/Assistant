from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from app.api import deps
from app.models import RetrievalMetric

router = APIRouter()


@router.get("/admin/projects/{project_id}/metrics/retrieval")
async def get_retrieval_metrics(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(deps.admin_required()),
):
    result = await db.execute(
        select(
            func.avg(RetrievalMetric.retrieval_time_ms),
            func.percentile_cont(0.95).within_group(RetrievalMetric.retrieval_time_ms),
            func.count(RetrievalMetric.id),
        ).where(RetrievalMetric.project_id == project_id)
    )
    avg_latency, p95_latency, total_queries = result.one()
    return {
        "avg_latency_ms": int(avg_latency or 0),
        "p95_latency_ms": int(p95_latency or 0),
        "total_queries": int(total_queries or 0),
    }
