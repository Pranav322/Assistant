import hashlib
import uuid
from typing import cast

import redis.asyncio as redis
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.document import Source
from app.rag_core.schemas import RetrieveRequest, RetrieveResponse, UrlIngestRequest
from app.rag_core.services.ingestion_validation import (
    derive_file_type,
    validate_file_content,
)
from app.rag_core.services.retrieval import RetrievalPipeline
from app.rag_core.services.storage import StorageService
from app.rag_core.services.url_fetcher import validate_url
from app.rag_core.worker.tasks import process_rag_core_ingestion_task

router = APIRouter()


@router.post("/ingest/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
):
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

    existing_source = await db.execute(
        select(Source).where(
            Source.project_id == project_id,
            Source.content_hash == content_hash,
        )
    )
    source = existing_source.scalar_one_or_none()
    if source and source.status in ["completed", "pending", "processing"]:
        return {"source_id": source.id, "status": source.status}

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
        raise HTTPException(status_code=500, detail="Failed to upload file")

    if source:
        result = await db.execute(
            update(Source)
            .where(Source.id == source.id, Source.status == "failed")
            .values(status="pending", storage_location=uploaded_path)
        )
        if result.rowcount == 0:
            await db.refresh(source)
            return {"source_id": source.id, "status": source.status}
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

    process_rag_core_ingestion_task.send(
        source_id=str(source.id),
        project_id=str(project_id),
        filename=filename,
        file_type=source.type,
        storage_path=uploaded_path,
        file_content=None,
    )

    return {"source_id": source.id, "status": source.status, "message": "Queued"}


@router.post("/ingest/url", status_code=status.HTTP_201_CREATED)
async def ingest_url(
    project_id: uuid.UUID,
    payload: UrlIngestRequest,
    db: AsyncSession = Depends(deps.get_db),
):
    url = str(payload.url)
    try:
        await validate_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    content_hash = hashlib.sha256(url.encode()).hexdigest()
    existing_source = await db.execute(
        select(Source).where(
            Source.project_id == project_id,
            Source.content_hash == content_hash,
        )
    )
    source = existing_source.scalar_one_or_none()
    if source and source.status in ["completed", "pending", "processing"]:
        return {"source_id": source.id, "status": source.status}

    if source:
        result = await db.execute(
            update(Source)
            .where(Source.id == source.id, Source.status == "failed")
            .values(status="pending")
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

    process_rag_core_ingestion_task.send(
        source_id=str(source.id),
        project_id=str(project_id),
        filename="url",
        file_type="url",
        storage_path=None,
        file_content=None,
        source_url=url,
    )

    return {"source_id": source.id, "status": source.status, "message": "Queued"}


@router.get("/ingest/{source_id}")
async def get_source_status(
    source_id: uuid.UUID,
    project_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
):
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


@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve(
    payload: RetrieveRequest,
    db: AsyncSession = Depends(deps.get_db),
    redis_client: redis.Redis = Depends(deps.get_redis),
):
    pipeline = RetrievalPipeline(db, redis_client=redis_client)
    result = await pipeline.retrieve(
        project_id=payload.project_id,
        query=payload.query,
        conversation_history=payload.conversation_history,
    )

    return RetrieveResponse(
        context=result.context.full_text,
        citations=result.citations,
        cache_hit_rate=result.cache_hit_rate,
    )
