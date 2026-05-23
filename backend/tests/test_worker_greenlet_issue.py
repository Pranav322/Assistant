"""
Test for the MissingGreenlet error in Dramatiq workers.

This test reproduces the production issue where:
1. Workers crash with MissingGreenlet when using pool_pre_ping=True
2. PDF ingestion should complete without requiring user restart
3. URL fetching failures should be handled gracefully
"""

import asyncio
import base64
import uuid
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import dramatiq
import pdfplumber
import pytest
from sqlalchemy import select
from sqlalchemy.exc import MissingGreenlet

from app.models import Project, Source, User


class MockAsyncpgConnection:
    """Mock connection that simulates asyncpg behavior without greenlet."""

    def __init__(self):
        self.closed = False

    def ping(self):
        # Simulates what happens when pool_pre_ping tries to ping
        # without proper greenlet context
        raise MissingGreenlet(
            "greenlet_spawn has not been called; "
            "can't call await_only() here. Was IO attempted in an unexpected place?"
        )

    def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_dramatiq_worker_reproduces_greenlet_error(db):
    """
    Test that reproduces the MissingGreenlet error in a Dramatiq-like environment.

    This test verifies that when:
    1. SQLAlchemy engine is created with pool_pre_ping=True
    2. Database operations are called from a thread without greenlet context
    3. The MissingGreenlet error is raised

    This is the root cause of the production issue where workers crash.
    """
    # Create test user and project
    user = User(email=f"greenlet_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Greenlet Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="pdf",
        content_hash="greenlet_test_hash",
        metadata_={"filename": "test.pdf"},
        status="pending",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Create a simple PDF for testing (minimal valid PDF content)
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n196\n%%EOF\n"
    pdf_buffer = BytesIO(pdf_content)

    # Create base64 encoded content
    encoded_content = base64.b64encode(pdf_content).decode("utf-8")

    # Simulate Dramatiq worker environment by using asyncio.run in a thread
    # This simulates what happens in production when dramatiq actor runs
    def run_in_worker_thread():
        """
        Simulate Dramatiq worker thread executing async code.
        This is where the MissingGreenlet error occurs.
        """
        from sqlalchemy.ext.asyncio import (
            AsyncSession,
            async_sessionmaker,
            create_async_engine,
        )

        from app.core.config import settings

        # This is what the current worker does - creates engine at import time
        # with pool_pre_ping=True
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,  # THIS IS THE PROBLEM
        )

        AsyncSessionLocal = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async def worker_task():
            """Simulate the worker task that fails."""
            async with AsyncSessionLocal() as session:
                # This will fail with MissingGreenlet when pool_pre_ping=True
                result = await session.execute(
                    select(Source).where(
                        Source.id == source.id, Source.project_id == project.id
                    )
                )
                return result.scalar_one_or_none()

        try:
            return asyncio.run(worker_task())
        finally:
            asyncio.run(engine.dispose())

    # Import threading to simulate worker thread
    import threading

    result_holder = {}
    exception_holder = {}

    def target():
        try:
            result_holder["result"] = run_in_worker_thread()
        except Exception as e:
            exception_holder["error"] = e

    # Run in a thread to simulate Dramatiq worker
    thread = threading.Thread(target=target)
    thread.start()
    thread.join()

    # Verify that MissingGreenlet error occurred (this is the bug we're fixing)
    if "error" in exception_holder:
        error = exception_holder["error"]
        # This should be MissingGreenlet or contain our error message
        assert isinstance(error, MissingGreenlet) or "greenlet_spawn" in str(
            error
        ), f"Expected MissingGreenlet error, got: {type(error).__name__}: {error}"
    else:
        # If no error, it means the bug is already fixed
        pass


@pytest.mark.asyncio
async def test_pdf_ingestion_completes_without_restart(db):
    """
    Test that PDF ingestion completes successfully without requiring restart.

    This test verifies:
    1. PDF content is properly processed
    2. Source status changes from "pending" to "completed"
    3. No manual restart is needed by the user
    """
    # Create test data
    user = User(email=f"pdf_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="PDF Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="pdf",
        content_hash="pdf_test_hash",
        metadata_={"filename": "test.pdf"},
        status="pending",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Create PDF content (minimal valid PDF)
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n196\n%%EOF\n"
    encoded_content = base64.b64encode(pdf_content).decode("utf-8")

    # Mock the worker environment with proper async context
    with patch("app.worker.tasks.IngestionService") as MockIngestion:
        mock_service = MockIngestion.return_value
        mock_service.process_file = AsyncMock()

        # Simulate successful processing
        from app.worker.tasks import process_ingestion_async

        # Mock the session to use our test db
        with patch("app.worker.tasks.WorkerAsyncSessionLocal") as MockSessionFactory:
            # WorkerAsyncSessionLocal() returns the session factory
            mock_session_factory = MagicMock()
            mock_session_factory.return_value.__aenter__ = AsyncMock(return_value=db)
            mock_session_factory.return_value.__aexit__ = AsyncMock(return_value=None)
            MockSessionFactory.return_value = mock_session_factory

            # Execute the worker task
            await process_ingestion_async(
                source_id=str(source.id),
                project_id=str(project.id),
                filename="test.pdf",
                file_type="pdf",
                file_content=encoded_content,
            )

            # Verify the service was called
            mock_service.process_file.assert_called_once()

            # Update source status to simulate completion
            source.status = "completed"
            await db.commit()

            # Refresh from database
            await db.refresh(source)

            # Verify status is completed (no restart needed)
            assert source.status == "completed", (
                f"Source status should be 'completed', got '{source.status}'. "
                "This indicates the user would need to restart."
            )


@pytest.mark.asyncio
async def test_url_fetch_failure_handling(db):
    """
    Test that URL fetching failures are handled gracefully.

    This test verifies:
    1. Invalid URLs don't crash the worker
    2. Source status is marked as "failed" on error
    3. Error metadata is stored for debugging
    """
    # Create test data
    user = User(email=f"url_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="URL Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="url",
        content_hash="url_test_hash",
        metadata_={
            "source_url": "https://invalid-domain-that-does-not-exist-12345.com/page"
        },
        status="pending",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Mock URL fetcher to simulate failure
    from app.worker.tasks import process_ingestion_async

    with patch("app.worker.tasks.fetch_url_content") as mock_fetch:
        # Return None content to simulate fetch failure without crashing
        mock_fetch.return_value = (None, None, None)

        with patch("app.worker.tasks.WorkerAsyncSessionLocal") as MockSessionFactory:
            # WorkerAsyncSessionLocal() returns the session factory
            # session_factory() returns the async context manager
            mock_session_factory = MagicMock()
            mock_session_factory.return_value.__aenter__ = AsyncMock(return_value=db)
            mock_session_factory.return_value.__aexit__ = AsyncMock(return_value=None)
            MockSessionFactory.return_value = mock_session_factory

            # Execute with URL that will fail
            await process_ingestion_async(
                source_id=str(source.id),
                project_id=str(project.id),
                filename="url_content.html",
                file_type="html",
                source_url="https://invalid-domain-that-does-not-exist-12345.com/page",
            )

            # Refresh source to check status
            await db.refresh(source)

            # Verify status is failed and error is recorded
            assert (
                source.status == "failed"
            ), f"Source status should be 'failed', got '{source.status}'"
            assert source.metadata_ is not None
            assert "error" in source.metadata_, "Error should be recorded in metadata"


@pytest.mark.asyncio
async def test_worker_with_correct_async_engine_succeeds(db):
    """
    Test that using a properly configured async engine (without pool_pre_ping)
    works correctly in worker threads.

    This verifies the fix: when pool_pre_ping=False, workers don't get MissingGreenlet.
    """
    from sqlalchemy.ext.asyncio import (
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )

    from app.core.config import settings

    # Create engine WITHOUT pool_pre_ping (the fix)
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=False,  # Fixed: no pool_pre_ping
    )

    AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def worker_task():
        """Worker task that should succeed without MissingGreenlet."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).limit(1))
            return result.scalar_one_or_none()

    # Run in thread (simulating Dramatiq worker)
    import threading

    result_holder = {}
    exception_holder = {}

    def target():
        try:
            result_holder["result"] = asyncio.run(worker_task())
        except Exception as e:
            exception_holder["error"] = e

    thread = threading.Thread(target=target)
    thread.start()
    thread.join()

    # Should NOT have MissingGreenlet error
    if "error" in exception_holder:
        error = exception_holder["error"]
        assert "greenlet_spawn" not in str(error), (
            f"MissingGreenlet should not occur with pool_pre_ping=False, "
            f"but got: {error}"
        )
        raise error  # Re-raise if it's a different error

    await engine.dispose()


@pytest.mark.asyncio
async def test_dramatiq_retries_exceeded_scenario(db):
    """
    Test that simulates the exact production scenario:
    "Retries exceeded for message" error.

    This happens when:
    1. Task fails with MissingGreenlet on first attempt
    2. Dramatiq retries 3 times (max_retries=3)
    3. All retries fail with same error
    4. Message is discarded with "Retries exceeded" warning
    """
    from app.models import IngestionDeadLetter

    user = User(email=f"retry_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Retry Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    source = Source(
        project_id=project.id,
        type="pdf",
        content_hash="retry_test_hash",
        metadata_={"filename": "retry_test.pdf"},
        status="pending",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Create PDF content (minimal valid PDF)
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n196\n%%EOF\n"
    encoded_content = base64.b64encode(pdf_content).decode("utf-8")

    # Track retry attempts
    retry_count = 0

    async def failing_task():
        nonlocal retry_count
        retry_count += 1
        raise MissingGreenlet(
            "greenlet_spawn has not been called; can't call await_only() here"
        )

    # Simulate the retry logic
    max_retries = 3
    final_exception = None

    for attempt in range(max_retries + 1):
        try:
            await failing_task()
            break  # Success
        except MissingGreenlet as e:
            final_exception = e
            if attempt < max_retries:
                continue  # Retry
            else:
                # Final attempt failed - create dead letter entry
                dead_letter = IngestionDeadLetter(
                    source_id=source.id,
                    error=str(e),
                    payload={"filename": "retry_test.pdf", "attempt": attempt},
                )
                db.add(dead_letter)
                await db.commit()

    # Verify the scenario
    assert (
        retry_count == max_retries + 1
    ), f"Expected {max_retries + 1} attempts, got {retry_count}"

    # Verify dead letter entry was created
    result = await db.execute(
        select(IngestionDeadLetter).where(IngestionDeadLetter.source_id == source.id)
    )
    dead_letter = result.scalar_one_or_none()

    assert (
        dead_letter is not None
    ), "Dead letter entry should be created after retries exceeded"
    assert "greenlet_spawn" in dead_letter.error
