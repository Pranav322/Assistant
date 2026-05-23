"""Tests for app.services.billing.get_effective_plan and billing endpoints."""

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

from app.services.billing import get_effective_plan

# ── Helpers ──────────────────────────────────────────────────


def _make_user(
    plan: str = "free", expires_at: datetime | None = None
) -> SimpleNamespace:
    """Create a lightweight user-like object for unit tests."""
    return SimpleNamespace(plan=plan, plan_expires_at=expires_at)


# ── Unit tests: get_effective_plan ───────────────────────────


class TestGetEffectivePlan:
    """Pure unit tests — no DB, no async."""

    def test_free_user_returns_free(self):
        user = _make_user(plan="free")
        assert get_effective_plan(user) == "free"

    def test_pro_user_with_future_expiry(self):
        future = datetime.now(timezone.utc) + timedelta(days=15)
        user = _make_user(plan="pro", expires_at=future)
        assert get_effective_plan(user) == "pro"

    def test_pro_user_with_past_expiry(self):
        past = datetime.now(timezone.utc) - timedelta(days=1)
        user = _make_user(plan="pro", expires_at=past)
        assert get_effective_plan(user) == "free"

    def test_pro_user_expired_just_now(self):
        # 1 second ago → should be free
        just_past = datetime.now(timezone.utc) - timedelta(seconds=1)
        user = _make_user(plan="pro", expires_at=just_past)
        assert get_effective_plan(user) == "free"

    def test_pro_user_with_no_expiry_stays_pro(self):
        # Edge case: plan="pro" but plan_expires_at=None → treated as pro
        user = _make_user(plan="pro", expires_at=None)
        assert get_effective_plan(user) == "pro"

    def test_naive_datetime_treated_as_utc(self):
        # Naive datetime (no tzinfo) in the future → still pro
        future_naive = (datetime.now(timezone.utc) + timedelta(days=10)).replace(
            tzinfo=None
        )
        user = _make_user(plan="pro", expires_at=future_naive)
        assert get_effective_plan(user) == "pro"

    def test_naive_datetime_expired_treated_as_utc(self):
        # Naive datetime in the past → free
        past_naive = (datetime.now(timezone.utc) - timedelta(days=1)).replace(
            tzinfo=None
        )
        user = _make_user(plan="pro", expires_at=past_naive)
        assert get_effective_plan(user) == "free"

    def test_unknown_plan_with_future_expiry(self):
        # Hypothetical plan name that isn't "free" → stays as-is if not expired
        future = datetime.now(timezone.utc) + timedelta(days=30)
        user = _make_user(plan="enterprise", expires_at=future)
        assert get_effective_plan(user) == "enterprise"

    def test_unknown_plan_with_past_expiry(self):
        past = datetime.now(timezone.utc) - timedelta(days=1)
        user = _make_user(plan="enterprise", expires_at=past)
        assert get_effective_plan(user) == "free"


# ── Integration tests: billing endpoints ─────────────────────


@pytest.mark.asyncio
async def test_get_plan_unauthenticated(client: AsyncClient):
    """GET /billing/plan without auth should return 401."""
    resp = await client.get("/api/v1/billing/plan")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_order_unauthenticated(client: AsyncClient):
    """POST /billing/create-order without auth should return 401."""
    resp = await client.post("/api/v1/billing/create-order")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_verify_payment_unauthenticated(client: AsyncClient):
    """POST /billing/verify-payment without auth should return 401."""
    resp = await client.post(
        "/api/v1/billing/verify-payment",
        json={
            "razorpay_order_id": "order_test",
            "razorpay_payment_id": "pay_test",
            "razorpay_signature": "sig_test",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_plan_authenticated(client: AsyncClient):
    """Authenticated user should see their free plan details."""
    email = f"billing_test_{uuid.uuid4()}@example.com"
    reg = await client.post(
        "/api/v1/auth/register", json={"email": email, "password": "password123"}
    )
    assert reg.status_code == 200

    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    token = login.json()["access_token"]

    resp = await client.get(
        "/api/v1/billing/plan",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] == "free"
    assert data["tokens_used"] == 0
    assert data["requests_used"] == 0
    assert data["plan_expires_at"] is None
