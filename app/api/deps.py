from typing import AsyncGenerator
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
import redis.asyncio as redis
from app.core.config import settings
from app.core.security import (
    API_KEY_PREFIX,
    decode_widget_token,
    hash_widget_token,
    validate_origin,
    verify_api_key,
)
from app.models import ApiKey, BrowserToken, Project
from app.services.rate_limit import RateLimiter
from app.services.audit import log_audit_event

engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        close_method = getattr(client, "aclose", None)
        if close_method:
            await close_method()
        else:
            await client.close()


@dataclass
class AuthContext:
    project_id: uuid.UUID
    api_key_id: uuid.UUID | None
    auth_type: str


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def _extract_bearer_token(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    if not auth_header.lower().startswith("bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def _get_request_origin(request: Request) -> str | None:
    return request.headers.get("origin")


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def _load_project(project_id: uuid.UUID, db: AsyncSession) -> Project | None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()


async def _find_api_key(
    project_id: uuid.UUID, api_key_value: str, db: AsyncSession
) -> ApiKey | None:
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.project_id == project_id,
            ApiKey.revoked_at.is_(None),
        )
    )
    for key in result.scalars().all():
        if key.expires_at and key.expires_at < datetime.now(timezone.utc):
            continue
        if verify_api_key(api_key_value, key.key_hash):
            return key
    return None


def api_key_required(endpoint: str):
    async def _dependency(
        project_id: uuid.UUID,
        request: Request,
        redis_client: redis.Redis = Depends(get_redis),
        db: AsyncSession = Depends(get_db),
    ) -> AuthContext:
        api_key_value = request.headers.get("x-api-key")
        if not api_key_value:
            api_key_value = _extract_bearer_token(request.headers.get("authorization"))

        if not api_key_value or not api_key_value.startswith(API_KEY_PREFIX):
            await log_audit_event(
                db,
                action="api_key_missing",
                project_id=project_id,
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
            )
            raise HTTPException(status_code=401, detail="API key required")

        project = await _load_project(project_id, db)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        api_key = await _find_api_key(project_id, api_key_value, db)
        if not api_key:
            await log_audit_event(
                db,
                action="api_key_invalid",
                project_id=project_id,
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                detail={"api_key_prefix": api_key_value[:12]},
            )
            raise HTTPException(status_code=401, detail="Invalid API key")

        origin = _get_request_origin(request)
        allowed_origins = api_key.allowed_origins or project.allowed_origins
        if origin:
            if not validate_origin(origin, allowed_origins):
                await log_audit_event(
                    db,
                    action="origin_mismatch",
                    project_id=project_id,
                    resource_type="api_key",
                    resource_id=str(api_key.id),
                    ip_address=_get_client_ip(request),
                    user_agent=request.headers.get("user-agent"),
                    detail={"origin": origin},
                )
                raise HTTPException(status_code=403, detail="Origin not allowed")

        limiter = RateLimiter(redis_client)
        allowed = await limiter.check(
            ip=_get_client_ip(request),
            api_key_prefix=api_key_value[:12],
            endpoint=endpoint,
            project_id=str(project_id),
            api_key_rate_limit=api_key.rate_limit,
        )
        if not allowed:
            await log_audit_event(
                db,
                action="rate_limit_exceeded",
                project_id=project_id,
                resource_type="api_key",
                resource_id=str(api_key.id),
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                detail={"endpoint": endpoint},
            )
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        request.state.project_id = project_id
        request.state.api_key_id = api_key.id

        return AuthContext(
            project_id=project_id, api_key_id=api_key.id, auth_type="api_key"
        )

    return _dependency


def widget_token_required(endpoint: str):
    async def _dependency(
        request: Request,
        redis_client: redis.Redis = Depends(get_redis),
        db: AsyncSession = Depends(get_db),
    ) -> AuthContext:
        token = _extract_bearer_token(request.headers.get("authorization"))
        if not token:
            raise HTTPException(status_code=401, detail="Bearer token required")

        claims = decode_widget_token(token)
        if claims.get("type") != "widget_token":
            raise HTTPException(status_code=401, detail="Invalid token type")

        origin = _get_request_origin(request)
        if not origin or not validate_origin(origin, claims.get("origins", [])):
            await log_audit_event(
                db,
                action="origin_mismatch",
                project_id=uuid.UUID(claims["sub"]),
                resource_type="widget_token",
                resource_id=claims.get("jti"),
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                detail={"origin": origin},
            )
            raise HTTPException(status_code=403, detail="Origin not allowed")

        project_id = uuid.UUID(claims["sub"])
        token_hash = hash_widget_token(token)
        result = await db.execute(
            select(BrowserToken).where(
                BrowserToken.token_hash == token_hash,
                BrowserToken.project_id == project_id,
            )
        )
        token_row = result.scalar_one_or_none()
        if token_row and token_row.revoked_at is not None:
            raise HTTPException(status_code=401, detail="Token revoked")
        if token_row:
            token_row.last_used_at = datetime.now(timezone.utc)
            await db.flush()

        limiter = RateLimiter(redis_client)
        allowed = await limiter.check(
            ip=_get_client_ip(request),
            api_key_prefix=None,
            endpoint=endpoint,
            project_id=str(project_id),
        )
        if not allowed:
            await log_audit_event(
                db,
                action="rate_limit_exceeded",
                project_id=project_id,
                resource_type="widget_token",
                resource_id=claims.get("jti"),
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                detail={"endpoint": endpoint},
            )
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        request.state.project_id = project_id
        request.state.api_key_id = token_row.api_key_id if token_row else None

        return AuthContext(
            project_id=project_id,
            api_key_id=request.state.api_key_id,
            auth_type="widget",
        )

    return _dependency


def chat_auth_required():
    async def _dependency(
        project_id: uuid.UUID,
        request: Request,
        redis_client: redis.Redis = Depends(get_redis),
        db: AsyncSession = Depends(get_db),
    ) -> AuthContext:
        auth_header = request.headers.get("authorization") or ""
        if auth_header.lower().startswith("bearer "):
            widget_ctx = await widget_token_required("chat")(
                request=request,
                redis_client=redis_client,
                db=db,
            )
            if widget_ctx.project_id != project_id:
                raise HTTPException(status_code=403, detail="Project mismatch")
            return widget_ctx

        return await api_key_required("chat")(
            project_id=project_id,
            request=request,
            redis_client=redis_client,
            db=db,
        )

    return _dependency
