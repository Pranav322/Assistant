import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import AsyncGenerator

import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import (
    API_KEY_PREFIX,
    decode_user_token,
    decode_widget_token,
    get_api_key_fast_hash,
    hash_widget_token,
    validate_origin,
    verify_api_key,
)
from app.models import ApiKey, BrowserToken, Project, User
from app.observability.metrics import record_auth_failure, record_rate_limit_hit
from app.services.audit import log_audit_event
from app.services.rate_limit import RateLimiter

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    pool_recycle=300,
)
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


@dataclass
class AccessContext:
    is_admin: bool
    user_id: uuid.UUID | None


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
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def _load_user(user_id: uuid.UUID, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def _find_api_key(
    project_id: uuid.UUID, api_key_value: str, db: AsyncSession
) -> ApiKey | None:
    # First verify the project is not deleted
    project = await _load_project(project_id, db)
    if not project:
        return None

    # Calculate fast hash for O(1) lookup
    fast_hash = get_api_key_fast_hash(api_key_value)

    # Try to find by fast_hash first
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.project_id == project_id,
            ApiKey.fast_hash == fast_hash,
            ApiKey.revoked_at.is_(None),
        )
    )

    # Handle collisions: iterate all matches (even if rare)
    for api_key in result.scalars().all():
        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            continue
        # Double check with slow hash
        if verify_api_key(api_key_value, api_key.key_hash):
            return api_key

    # FALLBACK: For legacy keys that don't have fast_hash yet
    # We only check keys where fast_hash is NULL to avoid doing the full scan if we know the key is newer
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.project_id == project_id,
            ApiKey.revoked_at.is_(None),
            ApiKey.fast_hash.is_(None),
        )
    )
    for key in result.scalars().all():
        if key.expires_at and key.expires_at < datetime.now(timezone.utc):
            continue
        if verify_api_key(api_key_value, key.key_hash):
            # Lazy backfill: Update the fast_hash for this legacy key
            # This migrates the key to the fast path for future requests
            try:
                key.fast_hash = fast_hash
                db.add(key)
                await db.commit()
                await db.refresh(key)
            except Exception:
                # If update fails, log it (system logging not set up here yet) or ignore to ensure auth succeeds
                # We don't want to block auth because migration failed
                pass
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
            record_auth_failure("api_key_missing")
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
            record_auth_failure("api_key_invalid")
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
                record_auth_failure("origin_mismatch")
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
            record_rate_limit_hit(endpoint)
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
            record_auth_failure("token_missing")
            raise HTTPException(status_code=401, detail="Bearer token required")

        claims = decode_widget_token(token)
        if claims.get("type") != "widget_token":
            record_auth_failure("token_invalid")
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
            record_auth_failure("origin_mismatch")
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
            record_auth_failure("token_revoked")
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
            record_rate_limit_hit(endpoint)
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


def admin_required():
    async def _dependency(request: Request) -> None:
        admin_key = request.headers.get("x-admin-key")
        if not admin_key or admin_key != settings.ADMIN_API_KEY:
            record_auth_failure("admin_key_invalid")
            raise HTTPException(status_code=401, detail="Admin key required")

    return _dependency


def admin_or_user_required():
    async def _dependency(
        request: Request,
        db: AsyncSession = Depends(get_db),
        redis_client: redis.Redis = Depends(get_redis),
    ) -> AccessContext:
        admin_key = request.headers.get("x-admin-key")
        if admin_key and settings.ADMIN_API_KEY and admin_key == settings.ADMIN_API_KEY:
            return AccessContext(is_admin=True, user_id=None)

        token = _extract_bearer_token(request.headers.get("authorization"))
        if not token:
            record_auth_failure("user_token_missing")
            raise HTTPException(status_code=401, detail="Bearer token required")

        try:
            claims = decode_user_token(token)
        except Exception as exc:
            record_auth_failure("user_token_invalid")
            raise HTTPException(status_code=401, detail="Invalid token") from exc

        if claims.get("type") != "user_token":
            record_auth_failure("user_token_invalid")
            raise HTTPException(status_code=401, detail="Invalid token type")

        try:
            user_id = uuid.UUID(str(claims.get("sub")))
        except ValueError as exc:
            record_auth_failure("user_token_invalid")
            raise HTTPException(status_code=401, detail="Invalid token") from exc

        user = await _load_user(user_id, db)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        limiter = RateLimiter(redis_client)
        allowed = await limiter.check(
            ip=_get_client_ip(request),
            api_key_prefix=None,
            endpoint="user",
            project_id=str(user_id),
            user_id=str(user_id),
        )
        if not allowed:
            record_rate_limit_hit("user")
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        request.state.user_id = user.id
        return AccessContext(is_admin=False, user_id=user.id)

    return _dependency


def project_access_required(endpoint: str):
    async def _dependency(
        project_id: uuid.UUID,
        request: Request,
        redis_client: redis.Redis = Depends(get_redis),
        db: AsyncSession = Depends(get_db),
    ) -> AuthContext:
        admin_key = request.headers.get("x-admin-key")
        if admin_key and settings.ADMIN_API_KEY and admin_key == settings.ADMIN_API_KEY:
            return AuthContext(
                project_id=project_id, api_key_id=None, auth_type="admin"
            )

        auth_header = request.headers.get("authorization") or ""
        if auth_header.lower().startswith("bearer "):
            token = _extract_bearer_token(auth_header)
            if token and token.startswith(API_KEY_PREFIX):
                return await api_key_required(endpoint)(
                    project_id=project_id,
                    request=request,
                    redis_client=redis_client,
                    db=db,
                )

            try:
                claims = decode_user_token(token or "")
            except Exception as exc:
                record_auth_failure("user_token_invalid")
                raise HTTPException(status_code=401, detail="Invalid token") from exc

            if claims.get("type") != "user_token":
                record_auth_failure("user_token_invalid")
                raise HTTPException(status_code=401, detail="Invalid token type")

            try:
                user_id = uuid.UUID(str(claims.get("sub")))
            except ValueError as exc:
                record_auth_failure("user_token_invalid")
                raise HTTPException(status_code=401, detail="Invalid token") from exc

            project = await db.execute(
                select(Project).where(
                    Project.id == project_id, Project.owner_id == user_id
                )
            )
            if not project.scalar_one_or_none():
                raise HTTPException(status_code=403, detail="Project mismatch")

            limiter = RateLimiter(redis_client)
            allowed = await limiter.check(
                ip=_get_client_ip(request),
                api_key_prefix=None,
                endpoint=endpoint,
                project_id=str(project_id),
                user_id=str(user_id),
            )
            if not allowed:
                record_rate_limit_hit(endpoint)
                raise HTTPException(status_code=429, detail="Rate limit exceeded")

            request.state.user_id = user_id
            return AuthContext(project_id=project_id, api_key_id=None, auth_type="user")

        return await api_key_required(endpoint)(
            project_id=project_id,
            request=request,
            redis_client=redis_client,
            db=db,
        )

    return _dependency
