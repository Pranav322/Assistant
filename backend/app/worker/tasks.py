import asyncio
import hashlib
import uuid
from typing import Optional
from urllib.parse import urlparse

import dramatiq
import redis.asyncio as redis
import structlog
from sqlalchemy import select

from app.core.config import settings
from app.models import Source
from app.services.ingestion import IngestionService
from app.services.ingestion_events import publish_ingestion_event
from app.services.ingestion_validation import derive_file_type
from app.services.storage import StorageService
from app.services.url_fetcher import fetch_url_content
from app.worker.db import create_worker_engine, create_worker_session_factory

logger = structlog.get_logger()


async def process_ingestion_async(
    source_id: str,
    project_id: str,
    filename: str,
    file_type: str,
    storage_path: Optional[str] = None,
    file_content: str | bytes | None = None,
    source_url: Optional[str] = None,
) -> None:
    import base64

    # Create a fresh engine per task so threads don't share asyncpg connections
    # across different event loops (each asyncio.run() creates a new event loop)
    engine = create_worker_engine()
    session_factory = create_worker_session_factory(engine)
    async with session_factory() as db:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        ingestion_service = IngestionService(db, redis_client=redis_client)
        storage_service = StorageService()

        source_uuid = uuid.UUID(source_id)
        project_uuid = uuid.UUID(project_id)

        try:
            content = file_content
            if content and isinstance(content, str):
                content = base64.b64decode(content)

            resolved_url = None
            content_type = None
            if not content and source_url:
                content, content_type, resolved_url = await fetch_url_content(
                    source_url
                )

            if not content and storage_path:
                content = await storage_service.get_file(storage_path)
        except Exception:
            close_method = getattr(redis_client, "aclose", None)
            if close_method:
                await close_method()
            else:
                await redis_client.close()
            raise

        if not content:
            try:
                logger.error(
                    "ingestion_task_failed",
                    error="No content found",
                    source_id=source_id,
                )
                # Issue #3: Update status to failed so user is not stuck in pending
                result = await db.execute(
                    select(Source).where(
                        Source.id == source_uuid, Source.project_id == project_uuid
                    )
                )
                source_record = result.scalar_one_or_none()
                if source_record:
                    source_record.status = "failed"
                    source_record.metadata_ = {
                        **(source_record.metadata_ or {}),
                        "error": "Content not found or empty",
                    }
                    await db.commit()
                    await publish_ingestion_event(
                        redis_client,
                        project_id=project_uuid,
                        source_id=source_record.id,
                        status=source_record.status,
                        progress=source_record.progress or {},
                        source_type=source_record.type,
                        filename=(source_record.metadata_ or {}).get("filename"),
                        error=(source_record.metadata_ or {}).get("error"),
                    )
            finally:
                close_method = getattr(redis_client, "aclose", None)
                if close_method:
                    await close_method()
                else:
                    await redis_client.close()
            return

        content_hash: Optional[str] = None
        if source_url:
            # Content-based dedupe (C1): identical content from a different URL
            # is a duplicate, even if the URL string differs (e.g. tracking params).
            content_hash = hashlib.sha256(content).hexdigest()
            dup_result = await db.execute(
                select(Source).where(
                    Source.project_id == project_uuid,
                    Source.content_hash == content_hash,
                    Source.status.in_(["completed", "processing"]),
                    Source.id != source_uuid,
                )
            )
            existing = dup_result.scalar_one_or_none()
            if existing is not None:
                result = await db.execute(
                    select(Source).where(
                        Source.id == source_uuid, Source.project_id == project_uuid
                    )
                )
                dup_source = result.scalar_one_or_none()
                if dup_source:
                    dup_source.status = "completed"
                    dup_source.metadata_ = {
                        **(dup_source.metadata_ or {}),
                        "source_url": source_url,
                        "resolved_url": resolved_url,
                        "duplicate_of": str(existing.id),
                    }
                    dup_source.progress = {"stage": "completed", "percent": 100}
                    await db.commit()
                    logger.info(
                        "ingestion_task_duplicate_collapsed",
                        source_id=source_id,
                        duplicate_of=str(existing.id),
                    )
                close_method = getattr(redis_client, "aclose", None)
                if close_method:
                    await close_method()
                else:
                    await redis_client.close()
                await engine.dispose()
                return

        try:
            ingest_filename = filename
            ingest_type = file_type
            if source_url:
                parsed = urlparse(resolved_url or source_url)
                ingest_filename = parsed.path.split("/")[-1] or "url"
                ingest_type = derive_file_type(ingest_filename, content_type)

            if content and source_url:
                upload_path = f"{project_id}/sources/{source_id}_{ingest_filename}"
                uploaded = await storage_service.upload_file(
                    content,
                    upload_path,
                    content_type=content_type,
                    metadata={"source_url": source_url},
                )
                if uploaded:
                    result = await db.execute(
                        select(Source).where(
                            Source.id == source_uuid,
                            Source.project_id == project_uuid,
                        )
                    )
                    source_record = result.scalar_one_or_none()
                    if source_record:
                        source_record.storage_location = uploaded
                        if content_hash:
                            source_record.content_hash = content_hash
                        source_record.metadata_ = {
                            **(source_record.metadata_ or {}),
                            "source_url": source_url,
                            "resolved_url": resolved_url,
                            "content_type": content_type,
                            "size_bytes": len(content),
                            "storage_path": uploaded,
                        }
                        await db.flush()

            await ingestion_service.process_file(
                file_content=content,
                filename=ingest_filename,
                project_id=project_uuid,
                file_type=ingest_type,
                metadata={
                    "content_type": content_type,
                    "source_url": source_url,
                    "resolved_url": resolved_url,
                },
                source_id=source_uuid,
            )
            logger.info("ingestion_task_completed", source_id=source_id)
        except ValueError as e:
            # Permanent failure (e.g. SSL error, 404, validation error).
            # Log, mark as failed, and DO NOT retry.
            logger.error(
                "ingestion_task_permanent_failure", error=str(e), source_id=source_id
            )
            result = await db.execute(
                select(Source).where(
                    Source.id == source_uuid, Source.project_id == project_uuid
                )
            )
            source_record = result.scalar_one_or_none()
            if source_record:
                source_record.status = "failed"
                source_record.metadata_ = {
                    **(source_record.metadata_ or {}),
                    "error": str(e),
                }
                await db.commit()
                await publish_ingestion_event(
                    redis_client,
                    project_id=project_uuid,
                    source_id=source_record.id,
                    status=source_record.status,
                    progress=source_record.progress or {},
                    source_type=source_record.type,
                    filename=(source_record.metadata_ or {}).get("filename"),
                    error=(source_record.metadata_ or {}).get("error"),
                )
            return
        except Exception as e:
            logger.error("ingestion_task_failed", error=str(e), source_id=source_id)
            # Issue #2: Re-raise to trigger Dramatiq retry.
            # On final retry, we should ideally write to dead letter, but Dramatiq
            # middleware is the standard place. Here we just ensure retries happen.
            # We also ensure the status is marked failed in the DB by the service
            # but we re-raise so the task queue knows it failed.

            # Write to Dead Letter Queue if retries exhausted (naive check)
            # Note: This is an approximation. Ideally use middleware.
            try:
                msg = dramatiq.middleware.CurrentMessage.get_current_message()
                retries = msg.options.get("retries", 0) if msg else 0
                if retries >= 3:  # 0, 1, 2, 3 (final attempt)
                    from app.models import IngestionDeadLetter

                    dead_letter = IngestionDeadLetter(
                        source_id=source_uuid,
                        error=str(e),
                        payload={
                            "filename": filename,
                            "file_type": file_type,
                            "storage_path": storage_path,
                            "source_url": source_url,
                        },
                    )
                    db.add(dead_letter)
                    await db.commit()
            except Exception:
                pass  # Don't let DLQ failure hide original error

            raise e
        finally:
            close_method = getattr(redis_client, "aclose", None)
            if close_method:
                await close_method()
            else:
                await redis_client.close()
    await engine.dispose()


@dramatiq.actor(
    queue_name="ingestion",
    max_retries=3,
)
def process_ingestion_task(
    source_id: str,
    project_id: str,
    filename: str,
    file_type: str,
    storage_path: Optional[str] = None,
    file_content: str | bytes | None = None,
    source_url: Optional[str] = None,
):
    """
    Background task to process file ingestion.
    Supports either direct byte content (for small files) or a storage path.
    """
    asyncio.run(
        process_ingestion_async(
            source_id=source_id,
            project_id=project_id,
            filename=filename,
            file_type=file_type,
            storage_path=storage_path,
            file_content=file_content,
            source_url=source_url,
        )
    )
