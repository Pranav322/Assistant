from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserUsage


async def get_or_create_user_usage(db: AsyncSession, user_id) -> UserUsage:
    result = await db.execute(select(UserUsage).where(UserUsage.user_id == user_id))
    usage = result.scalar_one_or_none()
    if usage:
        return usage

    usage = UserUsage(user_id=user_id, tokens_used=0, requests_used=0)
    db.add(usage)
    await db.flush()
    return usage


async def increment_user_usage(
    db: AsyncSession, user_id, tokens: int, requests: int
) -> UserUsage:
    usage = await get_or_create_user_usage(db, user_id)
    usage.tokens_used += int(tokens)
    usage.requests_used += int(requests)
    await db.flush()
    return usage
