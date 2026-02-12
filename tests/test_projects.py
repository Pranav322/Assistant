import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models import User, Project, ApiKey


@pytest.mark.asyncio
async def test_project_admin_flow(client: AsyncClient, db: AsyncSession):
    if not settings.ADMIN_API_KEY:
        settings.ADMIN_API_KEY = "dev_admin_key"
    user = User(email=f"proj_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    response = await client.post(
        "/api/v1/projects",
        json={"owner_id": str(user.id), "name": "Test Project"},
        headers={"X-Admin-Key": settings.ADMIN_API_KEY or "dev_admin_key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"

    project_id = data["id"]

    list_response = await client.get(
        "/api/v1/projects",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY or "dev_admin_key"},
    )
    assert list_response.status_code == 200
    assert any(p["id"] == project_id for p in list_response.json())

    created = (
        await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    ).scalar_one_or_none()
    assert created is not None

    key_response = await client.post(
        f"/api/v1/projects/{project_id}/api-keys",
        json={"name": "Primary"},
        headers={"X-Admin-Key": settings.ADMIN_API_KEY or "dev_admin_key"},
    )
    assert key_response.status_code == 200
    key_data = key_response.json()
    assert key_data["api_key"]
    assert key_data["id"]

    list_keys = await client.get(
        f"/api/v1/projects/{project_id}/api-keys",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY or "dev_admin_key"},
    )
    assert list_keys.status_code == 200
    assert any(key["id"] == key_data["id"] for key in list_keys.json())

    revoke = await client.post(
        f"/api/v1/projects/{project_id}/api-keys/{key_data['id']}/revoke",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY or "dev_admin_key"},
    )
    assert revoke.status_code == 200

    db_key = (
        await db.execute(select(ApiKey).where(ApiKey.id == uuid.UUID(key_data["id"])))
    ).scalar_one_or_none()
    assert db_key is not None
    assert db_key.revoked_at is not None


@pytest.mark.asyncio
async def test_project_user_flow(client: AsyncClient):
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": f"user_{uuid.uuid4()}@example.com", "password": "password123"},
    )
    assert register.status_code == 200

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": register.json()["email"], "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    create_project = await client.post(
        "/api/v1/projects",
        json={"name": "User Project"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_project.status_code == 200
    project_id = create_project.json()["id"]

    list_projects = await client.get(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_projects.status_code == 200
    assert any(p["id"] == project_id for p in list_projects.json())

    get_project = await client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_project.status_code == 200
    assert get_project.json()["name"] == "User Project"

    key_resp = await client.post(
        f"/api/v1/projects/{project_id}/api-keys",
        json={"name": "User Key"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert key_resp.status_code == 200
    assert key_resp.json()["api_key"]


@pytest.mark.asyncio
async def test_project_limit_for_free_user(client: AsyncClient):
    original_limit = settings.MAX_PROJECTS_PER_USER
    settings.MAX_PROJECTS_PER_USER = 1
    try:
        register = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"limit_{uuid.uuid4()}@example.com",
                "password": "password123",
            },
        )
        assert register.status_code == 200

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": register.json()["email"], "password": "password123"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]

        first = await client.post(
            "/api/v1/projects",
            json={"name": "First Project"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert first.status_code == 200

        second = await client.post(
            "/api/v1/projects",
            json={"name": "Second Project"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert second.status_code == 403
        assert "Upgrade" in second.json()["detail"]
    finally:
        settings.MAX_PROJECTS_PER_USER = original_limit
