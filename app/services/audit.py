import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import redact_sensitive
from app.models import AuditLog


async def log_audit_event(
    db: AsyncSession,
    action: str,
    project_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    commit: bool = True,
) -> None:
    payload = redact_sensitive(detail or {})
    record = AuditLog(
        project_id=project_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(record)
    if commit:
        await db.commit()
    else:
        await db.flush()
