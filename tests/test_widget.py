import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from httpx import AsyncClient
from app.models import User, Project, ApiKey, BrowserToken, WidgetMetric
from app.core.security import generate_api_key, hash_api_key, decode_widget_token


@pytest.mark.asyncio
async def test_widget_token_and_metrics_flow(client: AsyncClient, db: AsyncSession):
    user = User(email=f"widget_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(
        name="Widget Project",
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

    response = await client.post(
        "/api/v1/tokens/widget",
        json={"origin": "https://example.com", "project_id": str(project.id)},
        headers={"X-API-Key": api_key_value},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token"]
    assert data["expires_in"]

    claims = decode_widget_token(data["token"])
    assert claims["sub"] == str(project.id)

    token_rows = (
        (
            await db.execute(
                select(BrowserToken).where(BrowserToken.project_id == project.id)
            )
        )
        .scalars()
        .all()
    )
    assert token_rows

    metrics_response = await client.post(
        "/api/v1/metrics/widget",
        json={"metrics": [{"name": "widget_load_time", "value": 420}]},
        headers={
            "Authorization": f"Bearer {data['token']}",
            "Origin": "https://example.com",
        },
    )
    assert metrics_response.status_code == 202

    metric_rows = (
        (
            await db.execute(
                select(WidgetMetric).where(WidgetMetric.project_id == project.id)
            )
        )
        .scalars()
        .all()
    )
    assert metric_rows
