from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.services.audit import log_audit_event
from app.services.storage import StorageService
from app.services.ingestion_validation import derive_file_type, validate_file_content
from app.services.url_fetcher import validate_url
from app.schemas.ingestion import UrlIngestRequest
from app.models import Source
from app.worker.tasks import process_ingestion_task
import uuid
from typing import cast
import hashlib

router = APIRouter()


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

    # 2. Check project exists
    # (In a real app, this would be validated by auth/ownership)
    # project = await db.get(Project, project_id)
    # if not project: ...

    # 3. Check for existing source
    from sqlalchemy import select

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
        # If pending/failed, we might want to re-process. For now, let's continue.

    if not source:
        # Create Source record
        source = Source(
            project_id=project_id,
            type=file_type,
            content_hash=content_hash,
            metadata_={
                "filename": filename,
                "content_type": validation.mime_type,
                "size_bytes": validation.size_bytes,
                "page_count": validation.page_count,
            },
            status="pending",
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)

        await log_audit_event(
            db,
            action="file_uploaded",
            project_id=project_id,
            user_id=getattr(request.state, "user_id", None),
            resource_type="source",
            resource_id=str(source.id),
        )

    # 4. Storage (Optional but recommended)
    storage_service = StorageService()
    storage_path = f"{project_id}/sources/{source.id}_{filename}"
    uploaded_path = await storage_service.upload_file(
        content,
        storage_path,
        content_type=validation.mime_type,
        metadata={"content_hash": content_hash},
    )

    if uploaded_path:
        source.storage_location = uploaded_path
        source.metadata_ = {
            **(source.metadata_ or {}),
            "storage_path": uploaded_path,
        }
        await db.commit()

    import base64

    # 5. Queue Task
    # If storage skipped, we pass content directly (only for small files in this Phase 3 MVP)
    # Dramatiq requires JSON serializable arguments, so we base64 encode bytes.
    process_ingestion_task.send(
        source_id=str(source.id),
        project_id=str(project_id),
        filename=filename,
        file_type=source.type,
        storage_path=uploaded_path,
        file_content=(
            base64.b64encode(content).decode("utf-8") if not uploaded_path else None
        ),
    )

    return {
        "source_id": source.id,
        "status": source.status,
        "message": "Ingestion started",
    }


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
    from sqlalchemy import select

    existing_source = await db.execute(
        select(Source).where(
            Source.project_id == project_id,
            Source.content_hash == content_hash,
        )
    )
    source = existing_source.scalar_one_or_none()
    if source:
        return {"source_id": source.id, "status": source.status}

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
