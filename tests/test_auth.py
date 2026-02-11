import pytest
import uuid
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_login_me(client: AsyncClient):
    email = f"auth_test_{uuid.uuid4()}@example.com"
    password = "password123"

    register = await client.post(
        "/api/v1/auth/register", json={"email": email, "password": password}
    )
    assert register.status_code == 200
    user = register.json()
    assert user["email"] == email

    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert token

    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 200
    me_data = me.json()
    assert me_data["email"] == email


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    email = f"dupe_{uuid.uuid4()}@example.com"
    payload = {"email": email, "password": "password123"}
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 200
    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_register_password_too_short(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 400
