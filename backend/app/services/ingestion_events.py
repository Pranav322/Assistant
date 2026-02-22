import json
import uuid
from datetime import datetime
from typing import Any

import redis.asyncio as redis
import structlog

logger = structlog.get_logger()

INGESTION_CHANNEL_PREFIX = "ingestion_status"


def ingestion_channel(project_id: uuid.UUID) -> str:
    return f"{INGESTION_CHANNEL_PREFIX}:{project_id}"


def _json_default(value: Any) -> str:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


async def publish_ingestion_event(
    redis_client: redis.Redis | None,
    *,
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    status: str,
    progress: dict[str, Any] | None = None,
    source_type: str | None = None,
    filename: str | None = None,
    error: str | None = None,
) -> None:
    if redis_client is None:
        return

    payload: dict[str, Any] = {
        "project_id": project_id,
        "source_id": source_id,
        "status": status,
        "progress": progress or {},
    }
    if source_type is not None:
        payload["type"] = source_type
    if filename is not None:
        payload["filename"] = filename
    if error is not None:
        payload["error"] = error

    try:
        await redis_client.publish(
            ingestion_channel(project_id),
            json.dumps(payload, default=_json_default),
        )
    except Exception:
        logger.warning(
            "ingestion_event_publish_failed",
            project_id=str(project_id),
            source_id=str(source_id),
            status=status,
        )
