from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.services.storage import StorageService
from app.models import Source, Project
from app.worker.tasks import process_ingestion_task
import uuid
from typing import List, cast
import hashlib

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
):
    """
    Upload a document for processing.
    This creates a source record and queues a background task for chunking and embedding.
    """
    # 1. Read file content
    content = await file.read()
    filename = cast(str, file.filename) if file.filename else "upload"
    content_hash = hashlib.sha256(content).hexdigest()

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
        extension = filename.split(".")[-1].lower() if "." in filename else ""
        type_map = {
            "txt": "text",
            "text": "text",
            "md": "markdown",
            "markdown": "markdown",
            "pdf": "pdf",
        }
        source_type = type_map.get(extension, "text")
        # Create Source record
        source = Source(
            project_id=project_id,
            type=source_type,
            content_hash=content_hash,
            metadata_={"filename": filename},
            status="pending",
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)

    # 4. Storage (Optional but recommended)
    storage_service = StorageService()
    storage_path = f"{project_id}/sources/{source.id}_{filename}"
    uploaded_path = await storage_service.upload_file(content, storage_path)

    if uploaded_path:
        source.storage_location = uploaded_path
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
        file_content=base64.b64encode(content).decode("utf-8")
        if not uploaded_path
        else None,
    )

    return {
        "source_id": source.id,
        "status": source.status,
        "message": "Ingestion started",
    }


@router.get("/{source_id}", response_model=dict)
async def get_source_status(
    source_id: uuid.UUID, db: AsyncSession = Depends(deps.get_db)
):
    """
    Get the status of a source processing task.
    """
    from sqlalchemy import select

    result = await db.execute(select(Source).where(Source.id == source_id))
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
