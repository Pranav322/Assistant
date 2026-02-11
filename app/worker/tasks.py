import asyncio
import dramatiq
import uuid
from typing import Optional, Any
from urllib.parse import urlparse
from app.api.deps import AsyncSessionLocal
from app.services.ingestion import IngestionService
from app.services.storage import StorageService
from app.services.url_fetcher import fetch_url_content
from app.services.ingestion_validation import derive_file_type
from app.models import Source
from sqlalchemy import select
import structlog

logger = structlog.get_logger()


@dramatiq.actor(queue_name="ingestion")
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

    async def _run():
        import base64

        async with AsyncSessionLocal() as db:
            ingestion_service = IngestionService(db)
            storage_service = StorageService()

            source_uuid = uuid.UUID(source_id)
            project_uuid = uuid.UUID(project_id)

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

            if not content:
                logger.error(
                    "ingestion_task_failed",
                    error="No content found",
                    source_id=source_id,
                )
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
            except Exception as e:
                logger.error("ingestion_task_failed", error=str(e), source_id=source_id)

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        # This part is tricky if we are in the same thread.
        # But dramatiq workers run in their own threads/processes.
        # For tests where we ARE in the same thread:
        import nest_asyncio

        nest_asyncio.apply()
        loop.run_until_complete(_run())
    else:
        loop.run_until_complete(_run())
