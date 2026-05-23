import pytest

from app.core.config import settings


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "environment": settings.ENVIRONMENT}


@pytest.mark.asyncio
async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]
    assert response.headers.get("X-Frame-Options") == "DENY"
