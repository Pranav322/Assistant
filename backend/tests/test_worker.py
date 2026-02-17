import base64
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import Project, Source, User
from app.worker.tasks import process_ingestion_async


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
        status="pending",
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

        # 3. Execution (Running the async logic directly)
        with patch("app.worker.tasks.WorkerAsyncSessionLocal") as MockSessionFactory:
            # WorkerAsyncSessionLocal() returns the session factory
            mock_session_factory = MagicMock()
            mock_session_factory.return_value.__aenter__ = AsyncMock(return_value=db)
            mock_session_factory.return_value.__aexit__ = AsyncMock(return_value=None)
            MockSessionFactory.return_value = mock_session_factory

            await process_ingestion_async(
                source_id=str(source.id),
                project_id=str(project.id),
                filename="worker.txt",
                file_type="text",
                file_content=encoded_content,
            )

        # 4. Verification
        mock_service.process_file.assert_called_once()
        args, kwargs = mock_service.process_file.call_args
        assert kwargs["file_content"] == file_content
        assert str(kwargs["source_id"]) == str(source.id)
