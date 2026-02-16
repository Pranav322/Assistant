from fastapi.testclient import TestClient

from app.main import app
from app.observability import health

client = TestClient(app)


def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text


def test_health_ready(monkeypatch):
    async def ok():
        return True

    monkeypatch.setattr(health, "check_db", ok)
    monkeypatch.setattr(health, "check_redis", ok)
    monkeypatch.setattr(health, "check_s3", ok)

    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
