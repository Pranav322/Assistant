from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.api import deps
from app.models import Project


router = APIRouter()


@router.get("/usage")
async def get_usage(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.api_key_required("usage")),
):
    if auth.project_id != project_id:
        raise HTTPException(status_code=403, detail="Project mismatch")

    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    usage = project.usage or {}
    return {
        "requests": int(usage.get("requests", 0)),
        "tokens": int(usage.get("tokens_total", 0)),
    }
