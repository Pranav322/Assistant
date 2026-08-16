"""Public chatbot URL endpoints — no auth required."""

import re
import uuid
from datetime import datetime, timedelta, timezone

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.security import (
    create_widget_token,
    hash_widget_token,
    normalize_origin,
)
from app.models import BrowserToken, Project
from app.observability.metrics import record_rate_limit_hit
from app.services.rate_limit import RateLimiter

router = APIRouter()


class PublicChatTokenRequest(BaseModel):
    slug: str


class PublicChatTokenResponse(BaseModel):
    project_id: str
    token: str
    expires_in: int
    config: dict


def _slugify(name: str) -> str:
    """Convert a project name to a URL-safe slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    # Truncate to 50 chars
    return slug[:50] or "chatbot"


async def _generate_unique_slug(
    name: str, db: AsyncSession, exclude_project_id: uuid.UUID | None = None
) -> str:
    """Generate a unique slug from a project name, appending -2, -3 etc if needed."""
    base = _slugify(name)
    candidate = base
    counter = 2
    while True:
        stmt = select(Project).where(Project.public_slug == candidate)
        if exclude_project_id:
            stmt = stmt.where(Project.id != exclude_project_id)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            return candidate
        candidate = f"{base}-{counter}"
        counter += 1


@router.post("/public/chat-token", response_model=PublicChatTokenResponse)
async def get_public_chat_token(
    payload: PublicChatTokenRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    redis_client: redis.Redis = Depends(deps.get_redis),
):
    """
    Public endpoint — no authentication required.
    Resolves a project slug and issues a short-lived widget token.
    All rate limiting and token quotas still apply.
    """
    slug = payload.slug.strip().lower()

    # --- Look up project by slug ---
    result = await db.execute(
        select(Project).where(
            Project.public_slug == slug,
            Project.is_active == True,  # noqa: E712
            Project.deleted_at.is_(None),
            Project.public_chat_enabled == True,  # noqa: E712
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    # --- Rate limit by IP (same as other token endpoints) ---
    limiter = RateLimiter(redis_client)
    allowed = await limiter.check(
        ip=deps._get_client_ip(request),
        api_key_prefix=None,
        endpoint="token_refresh",
        project_id=str(project.id),
    )
    if not allowed:
        record_rate_limit_hit("public_chat_token")
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Please try again later."
        )

    # --- Determine origin for the token ---
    # The public chatbot page can be served from whatever domain the app is
    # deployed on (contextly.live today, but this must not hardcode or reuse
    # WIDGET_PUBLIC_ORIGIN — that setting is for the separate widget *iframe*
    # domain, e.g. widget.contextly.live, which is a different origin from
    # this standalone page and previously caused every chat call here to
    # fail origin validation). The request issuing this token is made from
    # the public chat page itself, so its real Origin header is the source
    # of truth.
    request_origin = deps._get_request_origin(request)
    public_origin = (
        normalize_origin(request_origin)
        if request_origin
        else normalize_origin("https://contextly.live")
    )
    token_origins = [public_origin]
    # Also allow localhost in development
    if deps.settings.ENVIRONMENT == "development":
        token_origins.append("http://localhost:3000")

    # --- Issue BrowserToken ---
    token_id = uuid.uuid4()
    token = create_widget_token(
        project_id=str(project.id),
        origins=token_origins,
        token_id=str(token_id),
    )
    token_hash = hash_widget_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=deps.settings.WIDGET_TOKEN_EXPIRE_SECONDS
    )

    db.add(
        BrowserToken(
            token_id=token_id,
            project_id=project.id,
            api_key_id=None,
            token_hash=token_hash,
            origin=public_origin,
            expires_at=expires_at,
        )
    )
    await db.commit()

    # --- Build config response ---
    settings_data = project.settings or {}
    config = {
        "title": settings_data.get("title", "Assistant"),
        "primary_color": settings_data.get("primary_color", "#4f46e5"),
        "welcome_message": settings_data.get(
            "welcome_message", "How can I help you today?"
        ),
        "starter_questions": settings_data.get("starter_questions", []),
        "logo_url": settings_data.get("logo_url"),
    }

    return PublicChatTokenResponse(
        project_id=str(project.id),
        token=token,
        expires_in=deps.settings.WIDGET_TOKEN_EXPIRE_SECONDS,
        config=config,
    )
