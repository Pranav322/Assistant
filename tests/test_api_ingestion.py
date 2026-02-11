import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, MagicMock
from app.models import Project, User, Source, ApiKey
from app.core.security import generate_api_key, hash_api_key
from sqlalchemy import select


@pytest.mark.asyncio
async def test_upload_document_endpoint(client: AsyncClient, db: AsyncSession):
    # 1. Setup
    user = User(email=f"api_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="API Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    api_key_value = generate_api_key()
    api_key = ApiKey(project_id=project.id, key_hash=hash_api_key(api_key_value))
    db.add(api_key)
    await db.commit()

    # 2. Mock worker task
    with patch("app.worker.tasks.process_ingestion_task.send") as mock_send:
        # 3. Request
        file_content = b"Content for API test"
        response = await client.post(
            f"/api/v1/ingestion/upload?project_id={project.id}",
            files={"file": ("test.txt", file_content, "text/plain")},
            headers={"X-API-Key": api_key_value},
        )

        assert response.status_code == 201
        data = response.json()
        assert "source_id" in data
        assert data["status"] == "pending"

        # 4. Verify DB
        source_id = uuid.UUID(data["source_id"])
        result = await db.execute(
            select(Source).where(
                Source.id == source_id,
                Source.project_id == project.id,
            )
        )
        source = result.scalar_one_or_none()
        assert source is not None
        assert source.project_id == project.id

        # 5. Verify task was queued
        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        assert kwargs["source_id"] == str(source_id)
        assert kwargs["project_id"] == str(project.id)
        assert kwargs["filename"] == "test.txt"


@pytest.mark.asyncio
async def test_upload_duplicate_document(client: AsyncClient, db: AsyncSession):
    user = User(email=f"dup_api_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Dup API Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    api_key_value = generate_api_key()
    api_key = ApiKey(project_id=project.id, key_hash=hash_api_key(api_key_value))
    db.add(api_key)
    await db.commit()

    file_content = b"Same content"

    # First upload
    await client.post(
        f"/api/v1/ingestion/upload?project_id={project.id}",
        files={"file": ("file1.txt", file_content, "text/plain")},
        headers={"X-API-Key": api_key_value},
    )

    # Second upload with same content
    response = await client.post(
        f"/api/v1/ingestion/upload?project_id={project.id}",
        files={"file": ("file2.txt", file_content, "text/plain")},
        headers={"X-API-Key": api_key_value},
    )

    assert response.status_code == 201
    data = response.json()
    # It should find the existing source
    # (Actually in my implementation, I return source_id and message "File already processed" if status is completed)
    # But if status is still pending, it might just return the ID.
    assert "source_id" in data


@pytest.mark.asyncio
async def test_get_source_status(client: AsyncClient, db: AsyncSession):
    user = User(email=f"status_api_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Status API Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    api_key_value = generate_api_key()
    api_key = ApiKey(project_id=project.id, key_hash=hash_api_key(api_key_value))
    db.add(api_key)
    await db.commit()

    source = Source(
        project_id=project.id,
        type="text",
        content_hash="somehash",
        metadata_={"filename": "status.txt"},
        status="completed",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    response = await client.get(
        f"/api/v1/ingestion/{source.id}?project_id={project.id}",
        headers={"X-API-Key": api_key_value},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(source.id)
    assert data["status"] == "completed"
    assert data["filename"] == "status.txt"
