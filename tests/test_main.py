from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "environment": "development"}


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]
    assert response.headers.get("X-Frame-Options") == "DENY"
