import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models import User, Project, RetrievalMetric


@pytest.mark.asyncio
async def test_admin_retrieval_metrics(client: AsyncClient, db: AsyncSession):
    if not settings.ADMIN_API_KEY:
        settings.ADMIN_API_KEY = "dev_admin_key"

    user = User(email=f"admin_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Admin Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    metric = RetrievalMetric(
        project_id=project.id,
        retrieval_time_ms=150,
    )
    db.add(metric)
    await db.commit()

    response = await client.get(
        f"/api/v1/admin/projects/{project.id}/metrics/retrieval",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_queries"] >= 1
