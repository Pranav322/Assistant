import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.core.firebase import verify_id_token
from app.core.security import create_access_token
from app.models import User
from app.schemas.auth import AuthResponse, FirebaseLoginRequest
from app.services.audit import log_audit_event

router = APIRouter()


@router.post("/auth/firebase", response_model=AuthResponse)
async def firebase_login(
    payload: FirebaseLoginRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Exchange a Firebase ID token for an API access token.
    Creates a new user if the email doesn't exist.
    """
    try:
        decoded_token = verify_id_token(payload.id_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    email = decoded_token.get("email")
    if not email:
        raise HTTPException(
            status_code=400, detail="Token must contain an email address"
        )

    email = email.strip().lower()

    # Check for existing user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    is_new_user = False
    if not user:
        # Create new user
        is_new_user = True
        user = User(
            email=email,
            email_verified=decoded_token.get("email_verified", False),
            password_hash=None,  # Firebase handles authentication
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        # Verify email if Firebase says it's verified
        if decoded_token.get("email_verified") and not user.email_verified:
            user.email_verified = True
        await db.commit()

    # Log the event
    await log_audit_event(
        db,
        action="user_login_firebase" if not is_new_user else "user_registered_firebase",
        user_id=user.id,
        ip_address=deps._get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        commit=False,
    )

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token)
