import asyncio
import uuid
from typing import Optional
from urllib.parse import urlparse

import dramatiq
from sqlalchemy import select

from app.models.document import Source
from app.models.system import IngestionDeadLetter
from app.rag_core.services.ingestion import IngestionService
from app.rag_core.services.ingestion_validation import derive_file_type
from app.rag_core.services.storage import StorageService
from app.rag_core.services.url_fetcher import fetch_url_content
from app.worker.db import WorkerAsyncSessionLocal


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

    session_factory = WorkerAsyncSessionLocal()
    async with session_factory() as db:
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
            content, content_type, resolved_url = await fetch_url_content(source_url)

        if not content and storage_path:
            content = await storage_service.get_file(storage_path)

        if not content:
            result = await db.execute(
                select(Source).where(
                    Source.id == source_uuid,
                    Source.project_id == project_uuid,
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
        except Exception as e:
            try:
                msg = dramatiq.middleware.CurrentMessage.get_current_message()
                retries = msg.options.get("retries", 0) if msg else 0
                if retries >= 3:
                    db.add(
                        IngestionDeadLetter(
                            source_id=source_uuid,
                            error=str(e),
                            payload={
                                "filename": filename,
                                "file_type": file_type,
                                "storage_path": storage_path,
                                "source_url": source_url,
                            },
                        )
                    )
                    await db.commit()
            except Exception:
                pass
            raise e


@dramatiq.actor(queue_name="ingestion", max_retries=3)
def process_rag_core_ingestion_task(
    source_id: str,
    project_id: str,
    filename: str,
    file_type: str,
    storage_path: Optional[str] = None,
    file_content: str | bytes | None = None,
    source_url: Optional[str] = None,
):
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
