import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from httpx import AsyncClient
from app.models import (
    User,
    Project,
    Source,
    Chunk,
    Embedding,
    ApiKey,
    Conversation,
    Message,
)
from app.core.security import generate_api_key, hash_api_key


@pytest.mark.asyncio
async def test_chat_endpoint_creates_conversation(
    client: AsyncClient, db: AsyncSession
):
    user = User(email=f"chat_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Chat Project", owner_id=user.id)
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
        content_hash="chat_hash",
        metadata_={"title": "Chat Doc"},
        status="completed",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    chunk = Chunk(
        project_id=project.id,
        source_id=source.id,
        text="banana apple",
        metadata_={},
    )
    db.add(chunk)
    await db.commit()
    await db.refresh(chunk)

    embedding_vector = [1.0] + [0.0] * 1535
    embedding = Embedding(
        chunk_id=chunk.id,
        project_id=project.id,
        embedding=embedding_vector,
    )
    db.add(embedding)
    await db.commit()

    with patch("app.services.chat.AsyncAzureOpenAI", return_value=MagicMock()):
        with patch(
            "app.services.chat.EmbeddingService.get_embeddings",
            new_callable=AsyncMock,
            return_value=[embedding_vector],
        ):
            with patch(
                "app.services.chat.ChatService._chat_completion",
                new_callable=AsyncMock,
                return_value=(
                    "Answer",
                    {"prompt_tokens": 3, "completion_tokens": 4, "total_tokens": 7},
                ),
            ):
                response = await client.post(
                    f"/api/v1/projects/{project.id}/chat",
                    json={"query": "banana"},
                    headers={"X-API-Key": api_key_value},
                )

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "Answer"
    assert data["citations"]
    assert data["conversation_id"]

    conversation_id = uuid.UUID(data["conversation_id"])
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project.id,
        )
    )
    conversation = result.scalar_one_or_none()
    assert conversation is not None
    assert conversation.message_count == 2

    messages = (
        (
            await db.execute(
                select(Message).where(Message.conversation_id == conversation_id)
            )
        )
        .scalars()
        .all()
    )
    assert len(messages) == 2

    project_usage = await db.execute(select(Project).where(Project.id == project.id))
    project_row = project_usage.scalar_one()
    assert project_row.usage.get("requests") == 1
    assert project_row.usage.get("tokens_total") == 7
