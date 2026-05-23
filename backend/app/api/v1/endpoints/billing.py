import logging
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import razorpay
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models import User
from app.services.audit import log_audit_event
from app.services.billing import get_effective_plan
from app.services.user_usage import get_or_create_user_usage

logger = logging.getLogger(__name__)

router = APIRouter()


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    razorpay_key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PlanResponse(BaseModel):
    plan: str
    plan_expires_at: str | None = None
    max_projects: int
    token_cap: int
    tokens_used: int
    requests_used: int


# ── #7: Cached Razorpay client (singleton) ──────────────────
@lru_cache(maxsize=1)
def _razorpay_client() -> razorpay.Client:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


@router.get("/billing/plan", response_model=PlanResponse)
async def get_plan(
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    user = (
        await db.execute(select(User).where(User.id == access.user_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    effective = get_effective_plan(user)
    usage = await get_or_create_user_usage(db, user.id)

    if effective == "free":
        max_projects = settings.MAX_PROJECTS_PER_USER
        token_cap = settings.USER_TOKEN_CAP
    else:
        max_projects = settings.PRO_MAX_PROJECTS_PER_USER
        token_cap = settings.PRO_USER_TOKEN_CAP

    return PlanResponse(
        plan=effective,
        plan_expires_at=(
            user.plan_expires_at.isoformat() if user.plan_expires_at else None
        ),
        max_projects=max_projects,
        token_cap=token_cap,
        tokens_used=usage.tokens_used,
        requests_used=usage.requests_used,
    )


@router.post("/billing/create-order", response_model=CreateOrderResponse)
async def create_order(
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    user = (
        await db.execute(select(User).where(User.id == access.user_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    effective = get_effective_plan(user)
    if effective == "pro":
        raise HTTPException(status_code=400, detail="Already on Pro plan")

    client = _razorpay_client()
    order = client.order.create(
        {
            "amount": settings.PRO_PLAN_AMOUNT_PAISE,
            "currency": "INR",
            "receipt": f"pro_{uuid.uuid4().hex[:16]}",
            "notes": {
                "user_id": str(user.id),
                "plan": "pro",
            },
        }
    )

    return CreateOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        razorpay_key_id=settings.RAZORPAY_KEY_ID or "",
    )


@router.post("/billing/verify-payment")
async def verify_payment(
    payload: VerifyPaymentRequest,
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    client = _razorpay_client()

    # Verify Razorpay signature
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            }
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # ── #1: Validate order ownership ─────────────────────────
    order = client.order.fetch(payload.razorpay_order_id)
    order_user_id = (order.get("notes") or {}).get("user_id")
    if order_user_id != str(access.user_id):
        logger.warning(
            "Order ownership mismatch: order user_id=%s, request user_id=%s",
            order_user_id,
            access.user_id,
        )
        raise HTTPException(
            status_code=403, detail="Order does not belong to this user"
        )

    # ── #2: Validate payment amount ──────────────────────────
    if order.get("amount") != settings.PRO_PLAN_AMOUNT_PAISE:
        logger.warning(
            "Amount mismatch: order amount=%s, expected=%s",
            order.get("amount"),
            settings.PRO_PLAN_AMOUNT_PAISE,
        )
        raise HTTPException(status_code=400, detail="Payment amount mismatch")

    user = (
        await db.execute(select(User).where(User.id == access.user_id))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── #6: Idempotency — skip if already on active Pro ──────
    effective = get_effective_plan(user)
    if effective == "pro":
        return {
            "status": "already_active",
            "plan": "pro",
            "plan_expires_at": (
                user.plan_expires_at.isoformat() if user.plan_expires_at else None
            ),
        }

    # Upgrade plan
    user.plan = "pro"
    user.plan_expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.PRO_PLAN_DURATION_DAYS
    )

    await db.commit()

    await log_audit_event(
        db,
        action="plan_upgraded",
        user_id=user.id,
        detail={
            "plan": "pro",
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "expires_at": user.plan_expires_at.isoformat(),
        },
        commit=False,
    )

    return {
        "status": "success",
        "plan": "pro",
        "plan_expires_at": user.plan_expires_at.isoformat(),
    }
