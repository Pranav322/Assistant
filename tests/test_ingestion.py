import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, patch
from app.services.ingestion import IngestionService
from app.models import Source, Chunk, Embedding, User, Project
from sqlalchemy import select


@pytest.mark.asyncio
async def test_ingestion_flow_text(db: AsyncSession):
    # 1. Setup User and Project
    user = User(email=f"ingest_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Ingest Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # 2. Mock Embedding Service to avoid API calls
    mock_embeddings = [[0.1] * 1536]  # Single chunk embedding

    with patch(
        "app.services.embedding.EmbeddingService.get_embeddings", new_callable=AsyncMock
    ) as mock_get_embeds:
        mock_get_embeds.return_value = mock_embeddings

        ingestion_service = IngestionService(db)

        # 3. Process a simple text file
        file_content = (
            b"This is a test document content. It should be chunked and embedded."
        )
        filename = "test.txt"

        source = await ingestion_service.process_file(
            file_content=file_content,
            filename=filename,
            project_id=project.id,
            file_type="text",
        )

        # 4. Verifications
        assert source.status == "completed"
        assert source.id is not None

        # Check Chunks
        result = await db.execute(
            select(Chunk).where(
                Chunk.source_id == source.id,
                Chunk.project_id == project.id,
            )
        )
        chunks = result.scalars().all()
        assert len(chunks) > 0
        assert (
            chunks[0].text
            == "This is a test document content. It should be chunked and embedded."
        )

        # Check Embeddings
        result = await db.execute(
            select(Embedding).where(Embedding.project_id == project.id)
        )
        embeddings = result.scalars().all()
        assert len(embeddings) == len(chunks)
        assert len(embeddings[0].embedding) == 1536


@pytest.mark.asyncio
async def test_ingestion_duplicate_prevention(db: AsyncSession):
    user = User(email=f"dup_test_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Dup Test Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    ingestion_service = IngestionService(db)
    file_content = b"Unique content for duplicate check"

    # Mocking embedding for the first call
    with patch(
        "app.services.embedding.EmbeddingService.get_embeddings", new_callable=AsyncMock
    ) as mock_get_embeds:
        mock_get_embeds.return_value = [[0.1] * 1536]

        # First ingest
        source1 = await ingestion_service.process_file(
            file_content=file_content,
            filename="file1.txt",
            project_id=project.id,
            file_type="text",
        )

        # Second ingest (same content)
        source2 = await ingestion_service.process_file(
            file_content=file_content,
            filename="file2.txt",
            project_id=project.id,
            file_type="text",
        )

        assert source1.id == source2.id
        assert source2.status == "completed"
