import base64
import hashlib
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select

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
        mock_session_factory = MagicMock()
        mock_session_factory.return_value.__aenter__ = AsyncMock(return_value=db)
        mock_session_factory.return_value.__aexit__ = AsyncMock(return_value=None)
        with patch("app.worker.tasks.create_worker_engine") as mock_create_engine, patch(
            "app.worker.tasks.create_worker_session_factory",
            return_value=mock_session_factory,
        ):
            mock_create_engine.return_value.dispose = AsyncMock()

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


@pytest.mark.asyncio
async def test_two_urls_same_content_produce_one_duplicate(db):
    user = User(email=f"worker_dedupe_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Dedupe Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    async def make_source(url: str) -> Source:
        src = Source(
            project_id=project.id,
            type="url",
            content_hash=hashlib.sha256(url.encode()).hexdigest(),
            metadata_={"source_url": url},
            status="pending",
        )
        db.add(src)
        await db.commit()
        await db.refresh(src)
        return src

    src_a = await make_source("https://example.com/a")
    src_b = await make_source("https://example.com/b?utm=x")

    body = (
        b"<html><body><article><h1>Same</h1>"
        b"<p>identical body</p></article></body></html>"
    )

    async def fake_process_file(
        *, file_content, filename, project_id, file_type, metadata, source_id
    ):
        result = await db.execute(select(Source).where(Source.id == source_id))
        src = result.scalar_one()
        src.status = "completed"
        await db.flush()
        return src

    mock_session_factory = MagicMock()
    mock_session_factory.return_value.__aenter__ = AsyncMock(return_value=db)
    mock_session_factory.return_value.__aexit__ = AsyncMock(return_value=None)

    with patch("app.worker.tasks.create_worker_engine") as mock_create_engine, patch(
        "app.worker.tasks.create_worker_session_factory",
        return_value=mock_session_factory,
    ), patch(
        "app.worker.tasks.fetch_url_content",
        new=AsyncMock(return_value=(body, "text/html", "https://example.com/a")),
    ), patch(
        "app.worker.tasks.StorageService"
    ) as MockStorage, patch(
        "app.worker.tasks.IngestionService"
    ) as MockIngestion:
        mock_create_engine.return_value.dispose = AsyncMock()
        MockStorage.return_value.upload_file = AsyncMock(
            return_value="mock/path/to/file"
        )
        mock_service = MockIngestion.return_value
        mock_service.process_file = AsyncMock(side_effect=fake_process_file)

        await process_ingestion_async(
            str(src_a.id),
            str(project.id),
            "url",
            "url",
            source_url="https://example.com/a",
        )
        await process_ingestion_async(
            str(src_b.id),
            str(project.id),
            "url",
            "url",
            source_url="https://example.com/b?utm=x",
        )

        # Only the first URL should have actually been vectorized.
        assert mock_service.process_file.call_count == 1

    result = await db.execute(select(Source).where(Source.project_id == project.id))
    sources = result.scalars().all()
    assert all(s.status != "failed" for s in sources)

    dup = [s for s in sources if (s.metadata_ or {}).get("duplicate_of")]
    assert len(dup) == 1
    assert dup[0].id == src_b.id
    assert dup[0].status == "completed"
    assert dup[0].metadata_["duplicate_of"] == str(src_a.id)
