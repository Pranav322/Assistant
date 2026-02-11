import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, Project, ApiKey
from app.core.security import generate_api_key, hash_api_key


@pytest.mark.asyncio
async def test_usage_endpoint(client: AsyncClient, db: AsyncSession):
    user = User(email=f"usage_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(
        name="Usage Project",
        owner_id=user.id,
        usage={"requests": 3, "tokens_total": 99},
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    api_key_value = generate_api_key()
    api_key = ApiKey(project_id=project.id, key_hash=hash_api_key(api_key_value))
    db.add(api_key)
    await db.commit()

    response = await client.get(
        f"/api/v1/usage?project_id={project.id}",
        headers={"X-API-Key": api_key_value},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["requests"] == 3
    assert data["tokens"] == 99
