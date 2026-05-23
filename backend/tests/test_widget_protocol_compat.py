import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_api_key, hash_api_key
from app.models import ApiKey, Project, User


@pytest.mark.asyncio
async def test_widget_chat_response_contains_citations_field(
    client: AsyncClient,
    db: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    user = User(email=f"proto_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(
        name="Protocol Project",
        owner_id=user.id,
        allowed_origins=["https://example.com"],
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    api_key_value = generate_api_key()
    api_key = ApiKey(project_id=project.id, key_hash=hash_api_key(api_key_value))
    db.add(api_key)
    await db.commit()

    async def fake_generate_response(
        self, project_id, query, conversation_id=None, project=None
    ):
        return {
            "response": "ok",
            "citations": [{"source": "https://example.com/doc"}],
            "conversation_id": (
                str(conversation_id) if conversation_id else str(uuid.uuid4())
            ),
        }

    monkeypatch.setattr(
        "app.services.chat.ChatService.generate_response",
        fake_generate_response,
    )

    response = await client.post(
        f"/api/v1/projects/{project.id}/chat",
        json={"query": "hello", "conversation_id": str(uuid.uuid4()), "stream": False},
        headers={"X-API-Key": api_key_value, "Origin": "https://example.com"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "citations" in body
    assert isinstance(body["citations"], list)
