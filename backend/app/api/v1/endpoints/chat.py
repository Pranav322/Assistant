import uuid

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models import Project, User
from app.observability.metrics import record_rate_limit_hit
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.billing import get_effective_plan
from app.services.chat import ChatService
from app.services.rate_limit import RateLimiter
from app.services.user_usage import get_or_create_user_usage

router = APIRouter()


@router.post("/projects/{project_id}/chat", response_model=ChatResponse)
async def chat(
    project_id: uuid.UUID,
    payload: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    _auth: deps.AuthContext = Depends(deps.chat_auth_required()),
    redis_client: redis.Redis = Depends(deps.get_redis),
):
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    owner_id = project.owner_id
    if owner_id:
        user_result = await db.execute(select(User).where(User.id == owner_id))
        user = user_result.scalar_one_or_none()
        if user:
            effective_plan = get_effective_plan(user)
            usage = await get_or_create_user_usage(db, owner_id)
            cap = (
                settings.USER_TOKEN_CAP
                if effective_plan == "free"
                else settings.PRO_USER_TOKEN_CAP
            )
            if usage.tokens_used >= cap:
                raise HTTPException(
                    status_code=429,
                    detail="Token limit reached. Upgrade required.",
                )

        limiter = RateLimiter(redis_client)
        allowed = await limiter.check(
            ip=deps._get_client_ip(request),
            api_key_prefix=None,
            endpoint="chat",
            project_id=str(project_id),
            user_id=str(owner_id),
        )
        if not allowed:
            record_rate_limit_hit("user_chat")
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
    service = ChatService(db, redis_client=redis_client)
    conversation_id = (
        uuid.UUID(payload.conversation_id) if payload.conversation_id else None
    )
    try:
        result = await service.generate_response(
            project_id, payload.query, conversation_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ChatResponse(**result)
