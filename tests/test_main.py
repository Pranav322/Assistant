from app.core.config import settings

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "environment": settings.ENVIRONMENT}


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]
    assert response.headers.get("X-Frame-Options") == "DENY"
