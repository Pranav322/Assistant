from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
import uuid
from app.api import deps
from app.schemas.widget import WidgetTokenRequest, WidgetTokenResponse
from app.core.security import create_widget_token, hash_widget_token, validate_origin
from app.models import BrowserToken, Project
from app.services.rate_limit import RateLimiter
from app.services.audit import log_audit_event
from app.observability.metrics import record_auth_failure, record_rate_limit_hit


router = APIRouter()


@router.post("/tokens/widget", response_model=WidgetTokenResponse)
async def create_widget_token_endpoint(
    payload: WidgetTokenRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    redis_client=Depends(deps.get_redis),
):
    try:
        project_id = uuid.UUID(payload.project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project_id") from exc

    api_key_value = request.headers.get("x-api-key")
    if not api_key_value:
        api_key_value = deps._extract_bearer_token(request.headers.get("authorization"))

    if not api_key_value or not api_key_value.startswith(deps.API_KEY_PREFIX):
        await log_audit_event(
            db,
            action="api_key_missing",
            project_id=project_id,
            ip_address=deps._get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
        record_auth_failure("api_key_missing")
        raise HTTPException(status_code=401, detail="API key required")

    project = await deps._load_project(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    api_key = await deps._find_api_key(project_id, api_key_value, db)
    if not api_key:
        await log_audit_event(
            db,
            action="api_key_invalid",
            project_id=project_id,
            ip_address=deps._get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
            detail={"api_key_prefix": api_key_value[:12]},
        )
        record_auth_failure("api_key_invalid")
        raise HTTPException(status_code=401, detail="Invalid API key")

    limiter = RateLimiter(redis_client)
    allowed = await limiter.check(
        ip=deps._get_client_ip(request),
        api_key_prefix=api_key_value[:12],
        endpoint="token_refresh",
        project_id=str(project_id),
        api_key_rate_limit=api_key.rate_limit,
    )
    if not allowed:
        record_rate_limit_hit("token_refresh")
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    origin = str(payload.origin).rstrip("/")
    allowed_origins = api_key.allowed_origins or project.allowed_origins
    if not validate_origin(origin, allowed_origins):
        await log_audit_event(
            db,
            action="origin_mismatch",
            project_id=project_id,
            resource_type="widget_token",
            ip_address=deps._get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
            detail={"origin": origin},
        )
        record_auth_failure("origin_mismatch")
        raise HTTPException(status_code=403, detail="Origin not allowed")

    token_id = uuid.uuid4()
    token = create_widget_token(
        project_id=str(project_id),
        origins=[origin],
        token_id=str(token_id),
    )
    token_hash = hash_widget_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=deps.settings.WIDGET_TOKEN_EXPIRE_SECONDS
    )

    browser_token = BrowserToken(
        token_id=token_id,
        project_id=project_id,
        api_key_id=api_key.id,
        token_hash=token_hash,
        origin=origin,
        expires_at=expires_at,
    )
    db.add(browser_token)
    await db.commit()

    await log_audit_event(
        db,
        action="widget_token_issued",
        project_id=project_id,
        resource_type="widget_token",
        resource_id=str(token_id),
        detail={"origin": origin},
        commit=True,
    )

    return WidgetTokenResponse(
        token=token,
        expires_in=deps.settings.WIDGET_TOKEN_EXPIRE_SECONDS,
    )
