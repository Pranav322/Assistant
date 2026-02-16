from datetime import datetime, timezone

from app.models import User


def get_effective_plan(user: User) -> str:
    """Return the user's effective plan considering expiry.

    If the user is on "pro" but ``plan_expires_at`` is in the past,
    they are treated as "free".
    """
    if user.plan != "free" and user.plan_expires_at is not None:
        if user.plan_expires_at.tzinfo is None:
            expires = user.plan_expires_at.replace(tzinfo=timezone.utc)
        else:
            expires = user.plan_expires_at
        if expires < datetime.now(timezone.utc):
            return "free"
    return user.plan
