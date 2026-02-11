from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.api import deps
from datetime import datetime, timezone
from app.models import Project, ApiKey
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse
from app.core.security import generate_api_key, hash_api_key
from app.services.audit import log_audit_event


router = APIRouter()


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(deps.admin_required()),
):
    result = await db.execute(select(Project).where(Project.deleted_at.is_(None)))
    projects = result.scalars().all()
    return [
        ProjectResponse(
            id=str(project.id),
            owner_id=str(project.owner_id),
            name=project.name,
            allowed_origins=project.allowed_origins or [],
            settings=project.settings or {},
            usage=project.usage or {},
            is_active=project.is_active,
        )
        for project in projects
    ]


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(deps.admin_required()),
):
    try:
        owner_id = uuid.UUID(payload.owner_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid owner_id") from exc

    project = Project(
        owner_id=owner_id,
        name=payload.name,
        allowed_origins=payload.allowed_origins or [],
        settings=payload.settings or {},
        usage={},
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    await log_audit_event(
        db,
        action="project_created",
        project_id=project.id,
        resource_type="project",
        resource_id=str(project.id),
        detail={"name": project.name},
        commit=False,
    )

    return ProjectResponse(
        id=str(project.id),
        owner_id=str(project.owner_id),
        name=project.name,
        allowed_origins=project.allowed_origins or [],
        settings=project.settings or {},
        usage=project.usage or {},
        is_active=project.is_active,
    )


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.api_key_required("projects")),
):
    if auth.project_id != project_id:
        raise HTTPException(status_code=403, detail="Project mismatch")

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=str(project.id),
        owner_id=str(project.owner_id),
        name=project.name,
        allowed_origins=project.allowed_origins or [],
        settings=project.settings or {},
        usage=project.usage or {},
        is_active=project.is_active,
    )


@router.post("/projects/{project_id}/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    project_id: uuid.UUID,
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(deps.admin_required()),
):
    project_exists = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    if not project_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    api_key_value = generate_api_key()
    key_hash = hash_api_key(api_key_value)

    api_key = ApiKey(
        project_id=project_id,
        name=payload.name,
        key_hash=key_hash,
        scopes=payload.scopes or ["ingest", "query"],
        allowed_origins=payload.allowed_origins or [],
        rate_limit=payload.rate_limit or {},
        usage_limit=payload.usage_limit or {},
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    await log_audit_event(
        db,
        action="api_key_created",
        project_id=project_id,
        resource_type="api_key",
        resource_id=str(api_key.id),
        detail={"name": api_key.name},
        commit=False,
    )

    return ApiKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        scopes=api_key.scopes or [],
        allowed_origins=api_key.allowed_origins or [],
        rate_limit=api_key.rate_limit or {},
        usage_limit=api_key.usage_limit or {},
        expires_at=api_key.expires_at.isoformat() if api_key.expires_at else None,
        revoked_at=api_key.revoked_at.isoformat() if api_key.revoked_at else None,
        prefix=api_key_value[:12],
        api_key=api_key_value,
    )


@router.get("/projects/{project_id}/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(deps.admin_required()),
):
    result = await db.execute(select(ApiKey).where(ApiKey.project_id == project_id))
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=str(key.id),
            name=key.name,
            scopes=key.scopes or [],
            allowed_origins=key.allowed_origins or [],
            rate_limit=key.rate_limit or {},
            usage_limit=key.usage_limit or {},
            expires_at=key.expires_at.isoformat() if key.expires_at else None,
            revoked_at=key.revoked_at.isoformat() if key.revoked_at else None,
            prefix=key.id.hex[:8],
        )
        for key in keys
    ]


@router.post(
    "/projects/{project_id}/api-keys/{api_key_id}/revoke", response_model=ApiKeyResponse
)
async def revoke_api_key(
    project_id: uuid.UUID,
    api_key_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(deps.admin_required()),
):
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.project_id == project_id,
            ApiKey.id == api_key_id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.revoked_at = datetime.now(timezone.utc)
    await db.commit()

    await log_audit_event(
        db,
        action="api_key_revoked",
        project_id=project_id,
        resource_type="api_key",
        resource_id=str(api_key.id),
        commit=False,
    )

    return ApiKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        scopes=api_key.scopes or [],
        allowed_origins=api_key.allowed_origins or [],
        rate_limit=api_key.rate_limit or {},
        usage_limit=api_key.usage_limit or {},
        expires_at=api_key.expires_at.isoformat() if api_key.expires_at else None,
        revoked_at=api_key.revoked_at.isoformat() if api_key.revoked_at else None,
    )
