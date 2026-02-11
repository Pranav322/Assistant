import pytest
import uuid
import base64
from unittest.mock import AsyncMock, patch
from app.worker.tasks import process_ingestion_task
from app.models import Source, Project, User

@pytest.mark.asyncio
async def test_process_ingestion_task_logic(db):
    # 1. Setup
    user = User(email=f"worker_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Worker Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="text",
        content_hash="workerhash",
        metadata_={"filename": "worker.txt"},
        status="pending"
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    file_content = b"Worker task content"
    encoded_content = base64.b64encode(file_content).decode("utf-8")

    # 2. Mock IngestionService
    with patch("app.worker.tasks.IngestionService") as MockIngestion:
        mock_service = MockIngestion.return_value
        mock_service.process_file = AsyncMock()
        
        # 3. Execution (Running the internal logic)
        # Note: process_ingestion_task uses asyncio.run() internally which might conflict with pytest-asyncio loop
        # But we can patch asyncio.run and run it manually
        with patch("app.worker.tasks.AsyncSessionLocal") as MockSession:
            MockSession.return_value.__aenter__.return_value = db
            
            # Since process_ingestion_task is an @actor, we call its underlying function if possible or just the actor itself
            # Dramatiq actors are callable and run synchronously in tests usually
            process_ingestion_task(
                source_id=str(source.id),
                project_id=str(project.id),
                filename="worker.txt",
                file_type="text",
                file_content=encoded_content
            )

        # 4. Verification
        mock_service.process_file.assert_called_once()
        args, kwargs = mock_service.process_file.call_args
        assert kwargs["file_content"] == file_content
        assert str(kwargs["source_id"]) == str(source.id)
