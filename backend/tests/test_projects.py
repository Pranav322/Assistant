import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, generate_api_key, hash_api_key
from app.models import ApiKey, Project, User


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


@pytest.mark.asyncio
async def test_list_sources_endpoint(client: AsyncClient, db: AsyncSession):
    user = User(email=f"list_src_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="List Sources Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    api_key_value = generate_api_key()
    api_key = ApiKey(project_id=project.id, key_hash=hash_api_key(api_key_value))
    db.add(api_key)
    await db.commit()

    from app.models import Source

    source1 = Source(
        project_id=project.id,
        type="text",
        content_hash="h1",
        metadata_={"filename": "f1.txt"},
        status="completed",
    )
    source2 = Source(
        project_id=project.id,
        type="url",
        content_hash="h2",
        metadata_={"source_url": "http://e.com"},
        status="pending",
    )
    db.add_all([source1, source2])
    await db.commit()

    response = await client.get(
        f"/api/v1/projects/{project.id}/sources",
        headers={"X-API-Key": api_key_value},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert any(s["metadata"]["filename"] == "f1.txt" for s in data)
    assert any(s["status"] == "pending" for s in data)


@pytest.mark.asyncio
async def test_delete_project_endpoint(client: AsyncClient, db: AsyncSession):
    user = User(email=f"del_proj_{uuid.uuid4()}@example.com")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Delete Me Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    token = create_access_token(str(user.id))

    response = await client.delete(
        f"/api/v1/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    # Verify soft delete
    # We must explicitly query for deleted items or check bypassing the default filter if implemented broadly
    # But here we just check if it's "gone" from the standard query
    result = await db.execute(select(Project).where(Project.id == project.id))
    # It might still be returned if we don't filter safely in test, but let's check the column
    # Actually our app code filters `deleted_at.is_(None)`, so `_load_project` would return None.

    # Let's check the DB row directly
    stmt = select(Project).where(Project.id == project.id)
    # This standard select usually doesn't have the global filter unless applied via filtered session or explicit clause
    # In `test_projects.py` we use a raw session.

    # Re-fetch
    result = await db.execute(stmt)
    p = result.scalar_one_or_none()
    assert p is not None
    assert p.deleted_at is not None
