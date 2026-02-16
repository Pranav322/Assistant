import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models import Project, User
from app.services.billing import get_effective_plan

router = APIRouter()


@router.get("/usage")
async def get_usage(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("usage")),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user = (
        await db.execute(select(User).where(User.id == project.owner_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Project owner not found")
    effective = get_effective_plan(user)
    cap = (
        settings.USER_TOKEN_CAP if effective == "free" else settings.PRO_USER_TOKEN_CAP
    )

    usage = project.usage or {}
    return {
        "requests": int(usage.get("requests", 0)),
        "tokens": int(usage.get("tokens_total", 0)),
        "limit": cap,
        "plan": effective,
    }
