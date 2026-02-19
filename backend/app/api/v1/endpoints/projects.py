import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.core.security import (
    generate_api_key,
    get_api_key_fast_hash,
    hash_api_key,
    normalize_origin,
)
from app.models import ApiKey, Project, User
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse
from app.schemas.ingestion import SourceResponse
from app.schemas.project import (
    ProjectConfigResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.audit import log_audit_event
from app.services.billing import get_effective_plan

router = APIRouter()


@router.get("/projects/{project_id}/sources", response_model=list[SourceResponse])
async def list_sources(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("projects")),
):
    from app.models import Source

    result = await db.execute(
        select(Source)
        .where(Source.project_id == project_id)
        .order_by(Source.created_at.desc())
    )
    sources = result.scalars().all()

    return [
        SourceResponse(
            id=source.id,
            project_id=source.project_id,
            type=source.type,
            content_hash=source.content_hash,
            metadata=source.metadata_ or {},
            status=source.status,
            progress=source.progress or {},
            created_at=source.created_at,
            updated_at=source.updated_at,
        )
        for source in sources
    ]


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    # Check access and get project in one go
    stmt = select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))

    if not access.is_admin:
        stmt = stmt.where(Project.owner_id == access.user_id)

    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=404, detail="Project not found or access denied"
        )

    project.deleted_at = datetime.now(timezone.utc)
    # Also revoke all API keys? For now, soft delete project prevents usage.

    await db.commit()

    await log_audit_event(
        db,
        action="project_deleted",
        project_id=project_id,
        resource_type="project",
        resource_id=str(project.id),
        commit=False,
    )


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    if access.is_admin:
        result = await db.execute(select(Project).where(Project.deleted_at.is_(None)))
    else:
        result = await db.execute(
            select(Project).where(
                Project.deleted_at.is_(None), Project.owner_id == access.user_id
            )
        )
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
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    if access.is_admin:
        if not payload.owner_id:
            raise HTTPException(status_code=400, detail="owner_id required")
        try:
            owner_id = uuid.UUID(payload.owner_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid owner_id") from exc
    else:
        owner_id = access.user_id

    allowed_origins = [
        normalize_origin(origin) for origin in payload.allowed_origins or []
    ]

    user_result = await db.execute(select(User).where(User.id == owner_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    effective_plan = get_effective_plan(user)
    max_projects = (
        settings.MAX_PROJECTS_PER_USER
        if effective_plan == "free"
        else settings.PRO_MAX_PROJECTS_PER_USER
    )
    count_result = await db.execute(
        select(func.count())
        .select_from(Project)
        .where(Project.owner_id == owner_id, Project.deleted_at.is_(None))
    )
    project_count = int(count_result.scalar_one() or 0)
    if project_count >= max_projects:
        raise HTTPException(
            status_code=403,
            detail="Project limit reached. Upgrade required.",
        )

    project = Project(
        owner_id=owner_id,
        name=payload.name,
        allowed_origins=allowed_origins,
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
    auth: deps.AuthContext = Depends(deps.project_access_required("projects")),
):
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


@router.get("/projects/{project_id}/config", response_model=ProjectConfigResponse)
async def get_project_config(
    project_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Public endpoint to fetch widget configuration.
    Protected by origin validation.
    """
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project or not project.is_active:
        raise HTTPException(status_code=404, detail="Project not found")

    # Origin Validation
    origin = request.headers.get("origin")
    if project.allowed_origins:
        # If allowed_origins is configured, origin header must be present
        if not origin:
            raise HTTPException(status_code=403, detail="Origin header required")
        from app.core.security import validate_origin

        if not validate_origin(origin, project.allowed_origins):
            raise HTTPException(status_code=403, detail="Origin not allowed")

    settings = project.settings or {}
    return ProjectConfigResponse(
        id=str(project.id),
        name=project.name,
        title=settings.get("title", "Assistant"),
        primary_color=settings.get("primary_color", "#4f46e5"),
        welcome_message=settings.get("welcome_message", "How can I help you today?"),
        starter_questions=settings.get("starter_questions", []),
        logo_url=settings.get("logo_url"),
    )


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("projects")),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name
    if payload.settings is not None:
        project.settings = payload.settings
    if payload.allowed_origins is not None:
        project.allowed_origins = [
            normalize_origin(origin) for origin in payload.allowed_origins
        ]

    await db.commit()
    await db.refresh(project)

    await log_audit_event(
        db,
        action="project_updated",
        project_id=project_id,
        resource_type="project",
        resource_id=str(project.id),
        detail=payload.model_dump(exclude_unset=True),
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


@router.post("/projects/{project_id}/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    project_id: uuid.UUID,
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(deps.get_db),
    _: deps.AuthContext = Depends(deps.project_access_required("projects")),
):
    project_exists = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    if not project_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    api_key_value = generate_api_key()
    key_hash = hash_api_key(api_key_value)

    allowed_origins = [
        normalize_origin(origin) for origin in payload.allowed_origins or []
    ]

    api_key = ApiKey(
        project_id=project_id,
        name=payload.name,
        key_hash=key_hash,
        fast_hash=get_api_key_fast_hash(api_key_value),
        scopes=payload.scopes or ["ingest", "query"],
        allowed_origins=allowed_origins,
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
    _: deps.AuthContext = Depends(deps.project_access_required("projects")),
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
    _: deps.AuthContext = Depends(deps.project_access_required("projects")),
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
