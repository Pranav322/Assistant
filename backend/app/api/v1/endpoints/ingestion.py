import asyncio
import hashlib
import json
import time
import uuid
from typing import cast

import redis.asyncio as redis
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models import Chunk, Embedding, Source
from app.schemas.ingestion import SourceResponse, UrlIngestRequest
from app.services.audit import log_audit_event
from app.services.ingestion_events import ingestion_channel
from app.services.ingestion_validation import derive_file_type, validate_file_content
from app.services.storage import StorageService
from app.services.url_fetcher import validate_url
from app.worker.tasks import process_ingestion_task

router = APIRouter()


def _format_sse(event: str, data: str) -> str:
    return f"event: {event}\ndata: {data}\n\n"


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: uuid.UUID,
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("ingestion")),
):
    """
    Upload a document for processing.
    This creates a source record and queues a background task for chunking and embedding.
    """
    from sqlalchemy import select, update, func

    # 1. Read file content
    content = await file.read()
    filename = cast(str, file.filename) if file.filename else "upload"
    content_hash = hashlib.sha256(content).hexdigest()

    file_type = derive_file_type(filename, file.content_type)
    try:
        validation = validate_file_content(
            content,
            filename,
            file_type=file_type,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # 2. Check for existing source
    existing_source = await db.execute(
        select(Source).where(
            Source.project_id == project_id, Source.content_hash == content_hash
        )
    )
    source = existing_source.scalar_one_or_none()

    if source:
        if source.status == "completed":
            return {
                "source_id": source.id,
                "status": source.status,
                "message": "File already processed",
            }
        if source.status in ["pending", "processing"]:
            return {
                "source_id": source.id,
                "status": source.status,
                "message": "File is already being processed",
            }
        # If status is "failed", we will attempt to re-process.

    # 3. Upload to Storage (Mandatory)
    # We use existing source ID if available, or generate a new one for the path
    source_id_for_path = source.id if source else uuid.uuid4()
    storage_service = StorageService()
    storage_path = f"{project_id}/sources/{source_id_for_path}_{filename}"

    uploaded_path = await storage_service.upload_file(
        content,
        storage_path,
        content_type=validation.mime_type,
        metadata={"content_hash": content_hash},
    )

    if not uploaded_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage",
        )

    # 4. Create or Update Source
    if source:
        # Atomic update: 'failed' -> 'pending' (Issue #10)
        result = await db.execute(
            update(Source)
            .where(Source.id == source.id, Source.status == "failed")
            .values(
                status="pending",
                storage_location=uploaded_path,
                metadata_=func.jsonb_set(Source.metadata_, "{error}", "null"),
                updated_at=func.now(),
            )
        )
        if result.rowcount == 0:
            # If update failed, it means status changed concurrently or wasn't failed
            await db.refresh(source)
            return {
                "source_id": source.id,
                "status": source.status,
                "message": "Status updated concurrently",
            }
    else:
        source = Source(
            id=source_id_for_path,
            project_id=project_id,
            type=file_type,
            content_hash=content_hash,
            metadata_={
                "filename": filename,
                "content_type": validation.mime_type,
                "size_bytes": validation.size_bytes,
                "page_count": validation.page_count,
            },
            storage_location=uploaded_path,
            status="pending",
        )
        db.add(source)

    await db.commit()
    await db.refresh(source)

    if not source:  # Should not happen, but satisfies type checker if needed
        raise HTTPException(status_code=500, detail="Failed to create source")

    await log_audit_event(
        db,
        action="file_uploaded",
        project_id=project_id,
        user_id=getattr(request.state, "user_id", None),
        resource_type="source",
        resource_id=str(source.id),
    )

    # 5. Queue Task (Issue #7: No base64 content)
    process_ingestion_task.send(
        source_id=str(source.id),
        project_id=str(project_id),
        filename=filename,
        file_type=source.type,
        storage_path=uploaded_path,
        file_content=None,
    )

    return {
        "source_id": source.id,
        "status": source.status,
        "message": "Ingestion started",
    }


@router.get("/stream")
async def stream_ingestion_status(
    project_id: uuid.UUID,
    request: Request,
    redis_client: redis.Redis = Depends(deps.get_redis),
    auth: deps.AuthContext = Depends(deps.project_access_required("ingestion")),
):
    channel = ingestion_channel(project_id)

    async def event_stream():
        pubsub = redis_client.pubsub()
        last_heartbeat = time.monotonic()
        heartbeat_interval_seconds = 15.0

        try:
            await pubsub.subscribe(channel)
            yield _format_sse("ready", json.dumps({"project_id": str(project_id)}))

            while True:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                now = time.monotonic()

                if message and message.get("type") == "message":
                    data = message.get("data")
                    if data:
                        yield _format_sse("ingestion_status", str(data))
                    last_heartbeat = now
                    continue

                if now - last_heartbeat >= heartbeat_interval_seconds:
                    heartbeat = json.dumps({"ts": int(time.time())})
                    yield _format_sse("heartbeat", heartbeat)
                    last_heartbeat = now
        except asyncio.CancelledError:
            raise
        finally:
            try:
                await pubsub.unsubscribe(channel)
            except Exception:
                pass
            close_method = getattr(pubsub, "aclose", None)
            if close_method:
                await close_method()
            else:
                await pubsub.close()

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=headers,
    )


@router.get("/{source_id}", response_model=dict)
async def get_source_status(
    source_id: uuid.UUID,
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("ingestion")),
):
    """
    Get the status of a source processing task.
    """
    from sqlalchemy import select

    result = await db.execute(
        select(Source).where(
            Source.id == source_id,
            Source.project_id == project_id,
        )
    )
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    return {
        "id": source.id,
        "status": source.status,
        "progress": source.progress,
        "type": source.type,
        "filename": (source.metadata_ or {}).get("filename"),
        "error": (source.metadata_ or {}).get("error"),
    }


@router.post("/url", status_code=status.HTTP_201_CREATED)
async def ingest_url(
    project_id: uuid.UUID,
    payload: UrlIngestRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("ingestion")),
):
    url = str(payload.url)
    try:
        await validate_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    content_hash = hashlib.sha256(url.encode()).hexdigest()
    from sqlalchemy import select, update, func

    existing_source = await db.execute(
        select(Source).where(
            Source.project_id == project_id,
            Source.content_hash == content_hash,
        )
    )
    source = existing_source.scalar_one_or_none()
    if source:
        if source.status == "completed":
            return {"source_id": source.id, "status": source.status}
        if source.status in ["pending", "processing"]:
            return {"source_id": source.id, "status": source.status}

        # Issue #4: Retry failed URL ingestion
        result = await db.execute(
            update(Source)
            .where(Source.id == source.id, Source.status == "failed")
            .values(
                status="pending",
                metadata_=func.jsonb_set(Source.metadata_, "{error}", "null"),
                updated_at=func.now(),
            )
        )
        if result.rowcount == 0:
            await db.refresh(source)
            return {"source_id": source.id, "status": source.status}

    else:
        source = Source(
            project_id=project_id,
            type="url",
            content_hash=content_hash,
            metadata_={"source_url": url},
            status="pending",
        )
        db.add(source)

    await db.commit()
    await db.refresh(source)

    await log_audit_event(
        db,
        action="url_ingested",
        project_id=project_id,
        user_id=getattr(request.state, "user_id", None),
        resource_type="source",
        resource_id=str(source.id),
    )

    process_ingestion_task.send(
        source_id=str(source.id),
        project_id=str(project_id),
        filename="url",
        file_type="url",
        storage_path=None,
        file_content=None,
        source_url=url,
    )

    return {
        "source_id": source.id,
        "status": source.status,
        "message": "Ingestion started",
    }


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: uuid.UUID,
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.project_access_required("ingestion")),
):
    """
    Delete a source and all its associated data (chunks, embeddings).
    """
    from sqlalchemy import select

    # 1. Get Source
    result = await db.execute(
        select(Source).where(
            Source.id == source_id,
            Source.project_id == project_id,
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # 2. Delete file from storage if it exists
    if source.storage_location:
        try:
            storage_service = StorageService()
            await storage_service.delete_file(source.storage_location)
        except Exception:
            # If storage deletion fails, we still want to remove the DB record
            # but we log the error (in a real app)
            pass

    # 3. Delete Source (Cascade should handle Chunks and Embeddings)
    await db.delete(source)
    await db.commit()
