from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import uuid
from app.api import deps
from app.models import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_user_token,
)
from app.core.config import settings
from app.services.audit import log_audit_event
from app.observability.metrics import record_auth_failure


router = APIRouter()


@router.post("/auth/register", response_model=UserResponse)
async def register_user(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
):
    email = payload.email.strip().lower()
    if len(payload.password) < settings.MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail="Password too short")

    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=email, password_hash=get_password_hash(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await log_audit_event(
        db,
        action="user_registered",
        user_id=user.id,
        ip_address=deps._get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        commit=False,
    )

    return UserResponse(
        id=str(user.id),
        email=user.email,
        email_verified=user.email_verified,
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login_user(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
):
    email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        record_auth_failure("invalid_credentials")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        record_auth_failure("invalid_credentials")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    await log_audit_event(
        db,
        action="user_login",
        user_id=user.id,
        ip_address=deps._get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        commit=False,
    )

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token)


@router.get("/auth/me", response_model=UserResponse)
async def get_me(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
):
    token = deps._extract_bearer_token(request.headers.get("authorization"))
    if not token:
        raise HTTPException(status_code=401, detail="Bearer token required")

    try:
        claims = decode_user_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if claims.get("type") != "user_token":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = claims.get("sub")
    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=str(user.id),
        email=user.email,
        email_verified=user.email_verified,
    )
