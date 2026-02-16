# Upgrading from One-Time Payments to Razorpay Subscriptions

> This guide explains how to migrate from the current time-limited one-time payment model
> (Option 3) to full Razorpay Subscriptions (Option 1) with auto-renewal and webhooks.

## Prerequisites

- A deployed backend with a **public HTTPS URL** (Razorpay webhooks won't hit `localhost`)
- Razorpay Dashboard access to create Plans and configure Webhooks

---

## Step 1: Create a Razorpay Plan in Dashboard

Go to `Razorpay Dashboard → Subscriptions → Plans → Create Plan`:

| Field | Value |
|---|---|
| Name | Pro Monthly |
| Amount | ₹499 |
| Period | Monthly |
| Interval | 1 |

Note the `plan_id` (e.g., `plan_XXXXXXXXXXXXXX`). Add it to `.env`:

```env
RAZORPAY_PLAN_ID="plan_XXXXXXXXXXXXXX"
```

---

## Step 2: Replace Create-Order with Create-Subscription

Currently your `POST /billing/create-order` creates a one-time Razorpay order.
Replace it with a subscription creation:

```python
# app/api/v1/endpoints/billing.py

@router.post("/billing/subscribe")
async def create_subscription(
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    subscription = client.subscription.create({
        "plan_id": settings.RAZORPAY_PLAN_ID,
        "total_count": 12,  # max 12 renewals (1 year)
        "quantity": 1,
        "customer_notify": 1,
    })

    # Store subscription_id on the user for tracking
    user = (await db.execute(select(User).where(User.id == access.user_id))).scalar_one()
    # You'll need to add a `razorpay_subscription_id` column to the users table
    user.razorpay_subscription_id = subscription["id"]
    await db.commit()

    return {
        "subscription_id": subscription["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
    }
```

Frontend opens checkout with `subscription_id` instead of `order_id`:
```javascript
const options = {
    key: data.razorpay_key_id,
    subscription_id: data.subscription_id,  // changed from order_id
    handler: function (response) {
        // response has: razorpay_payment_id, razorpay_subscription_id, razorpay_signature
        verifySubscription(response);
    },
};
```

---

## Step 3: Add Webhook Endpoint

This is the **key addition**. Razorpay sends events when payments succeed/fail.

### 3a. Add webhook secret to `.env`

```env
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_from_dashboard"
```

### 3b. Create webhook endpoint

```python
# app/api/v1/endpoints/billing.py

import hmac
import hashlib

@router.post("/billing/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = await request.json()
    event = payload.get("event")

    if event == "subscription.activated":
        # First payment successful — upgrade to pro
        sub_id = payload["payload"]["subscription"]["entity"]["id"]
        user = await _find_user_by_subscription(db, sub_id)
        if user:
            user.plan = "pro"
            user.plan_expires_at = None  # subscription handles expiry
            await db.commit()

    elif event == "subscription.charged":
        # Recurring payment succeeded — extend/confirm pro
        sub_id = payload["payload"]["subscription"]["entity"]["id"]
        user = await _find_user_by_subscription(db, sub_id)
        if user:
            user.plan = "pro"
            # Reset token usage for new billing cycle
            usage = await get_or_create_user_usage(db, user.id)
            usage.tokens_used = 0
            usage.requests_used = 0
            await db.commit()

    elif event in ("subscription.cancelled", "subscription.completed"):
        # Subscription ended — downgrade to free
        sub_id = payload["payload"]["subscription"]["entity"]["id"]
        user = await _find_user_by_subscription(db, sub_id)
        if user:
            user.plan = "free"
            user.razorpay_subscription_id = None
            await db.commit()

    elif event == "subscription.halted":
        # Payment failed after retries — downgrade
        sub_id = payload["payload"]["subscription"]["entity"]["id"]
        user = await _find_user_by_subscription(db, sub_id)
        if user:
            user.plan = "free"
            await db.commit()

    return {"status": "ok"}


async def _find_user_by_subscription(db, subscription_id):
    result = await db.execute(
        select(User).where(User.razorpay_subscription_id == subscription_id)
    )
    return result.scalar_one_or_none()
```

### 3c. Configure webhook in Razorpay Dashboard

Go to `Settings → Webhooks → Add New`:
- URL: `https://yourdomain.com/api/v1/billing/webhook`
- Secret: generate one and add to `.env`
- Events to subscribe:
  - `subscription.activated`
  - `subscription.charged`
  - `subscription.cancelled`
  - `subscription.completed`
  - `subscription.halted`

---

## Step 4: Database Migration

Add these columns to the `users` table:

```sql
ALTER TABLE users ADD COLUMN razorpay_subscription_id TEXT;
ALTER TABLE users ADD COLUMN razorpay_customer_id TEXT;
CREATE INDEX idx_users_subscription ON users(razorpay_subscription_id)
    WHERE razorpay_subscription_id IS NOT NULL;
```

And update the SQLAlchemy model:

```python
# app/models/user.py
razorpay_subscription_id: Mapped[str | None] = mapped_column(String, nullable=True)
razorpay_customer_id: Mapped[str | None] = mapped_column(String, nullable=True)
```

---

## Step 5: Token Reset on Renewal

With subscriptions, tokens should reset each billing cycle. This is handled in
the `subscription.charged` webhook above (`usage.tokens_used = 0`).

Remove any manual `plan_expires_at` checks — the webhook now controls the plan status.

---

## Step 6: Add Cancellation Endpoint

```python
@router.post("/billing/cancel")
async def cancel_subscription(
    db: AsyncSession = Depends(deps.get_db),
    access: deps.AccessContext = Depends(deps.admin_or_user_required()),
):
    user = (await db.execute(select(User).where(User.id == access.user_id))).scalar_one()
    if not user.razorpay_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    client.subscription.cancel(user.razorpay_subscription_id, {"cancel_at_cycle_end": 1})

    return {"status": "cancellation_scheduled"}
```

`cancel_at_cycle_end: 1` means the user keeps Pro until the current period ends.

---

## What Stays the Same (No Changes Needed)

These parts of Option 3 carry over directly:
- ✅ Plan-based limit checks in `chat.py` and `projects.py`
- ✅ `config.py` settings for Pro limits
- ✅ `/billing/plan` endpoint
- ✅ Frontend pricing page design
- ✅ `UserResponse` with `plan` field

## What Changes

| Component | Option 3 (Current) | Option 1 (Subscription) |
|---|---|---|
| Payment trigger | `create-order` → one-time | `subscribe` → recurring |
| Plan activation | `verify-payment` endpoint | `subscription.activated` webhook |
| Token reset | On re-purchase | On `subscription.charged` webhook |
| Plan expiry | `plan_expires_at` timestamp check | Webhook sets `plan = "free"` on cancel |
| Cancellation | N/A (just don't rebuy) | `POST /billing/cancel` endpoint |
| New DB columns | `plan_expires_at` | `razorpay_subscription_id`, `razorpay_customer_id` |
