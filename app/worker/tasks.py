import asyncio
import dramatiq
import uuid
from typing import Optional, Any
from app.api.deps import AsyncSessionLocal
from app.services.ingestion import IngestionService
from app.services.storage import StorageService
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
                await ingestion_service.process_file(
                    file_content=content,
                    filename=filename,
                    project_id=project_uuid,
                    file_type=file_type,
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
