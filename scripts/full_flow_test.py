import os
import sys
import time
import uuid
import json
from typing import Any
import httpx


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001/api/v1")
WIDGET_ORIGIN = os.getenv("WIDGET_ORIGIN", "http://localhost:3000")
EMAIL = os.getenv("TEST_EMAIL")
PASSWORD = os.getenv("TEST_PASSWORD", "password123")
MAX_INGEST_WAIT_SECONDS = int(os.getenv("MAX_INGEST_WAIT_SECONDS", "60"))
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "60"))


def _print_step(title: str) -> None:
    print(f"\n== {title} ==")


def _request(
    client: httpx.Client, method: str, path: str, **kwargs: Any
) -> httpx.Response:
    url = f"{API_BASE_URL}{path}"
    response = client.request(method, url, **kwargs)
    if response.status_code >= 400:
        print(f"Request failed: {method} {url}")
        print(response.status_code, response.text)
        response.raise_for_status()
    return response


def main() -> int:
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
        _print_step("Health")
        base_root = API_BASE_URL.split("/api/v1")[0]
        health = client.get(f"{base_root}/health")
        print(health.status_code, health.json())

        _print_step("Register")
        email = EMAIL or f"flow_{uuid.uuid4()}@example.com"
        register = client.post(
            f"{API_BASE_URL}/auth/register",
            json={"email": email, "password": PASSWORD},
        )
        if register.status_code == 409:
            print("Email already registered, continuing to login")
        elif register.status_code >= 400:
            print(register.status_code, register.text)
            return 1

        _print_step("Login")
        login = _request(
            client,
            "POST",
            "/auth/login",
            json={"email": email, "password": PASSWORD},
        )
        user_token = login.json()["access_token"]
        print("User token acquired")

        _print_step("Create Project")
        project = _request(
            client,
            "POST",
            "/projects",
            json={"name": "Flow Project", "allowed_origins": [WIDGET_ORIGIN]},
            headers={"Authorization": f"Bearer {user_token}"},
        ).json()
        project_id = project["id"]
        print("Project:", project_id)

        _print_step("Create API Key")
        api_key_response = _request(
            client,
            "POST",
            f"/projects/{project_id}/api-keys",
            json={"name": "Flow Key"},
            headers={"Authorization": f"Bearer {user_token}"},
        ).json()
        api_key_value = api_key_response.get("api_key")
        if not api_key_value:
            print("API key not returned, cannot continue")
            return 1
        print("API key issued (prefix only):", api_key_response.get("prefix"))

        _print_step("Ingest File")
        file_content = b"This is a test document for ingestion."
        upload = _request(
            client,
            "POST",
            f"/ingestion/upload?project_id={project_id}",
            files={"file": ("test.txt", file_content, "text/plain")},
            headers={"X-API-Key": api_key_value},
        ).json()
        source_id = upload["source_id"]
        print("Source:", source_id)

        _print_step("Poll Ingestion Status")
        status = "pending"
        start = time.time()
        while time.time() - start < MAX_INGEST_WAIT_SECONDS:
            status_resp = _request(
                client,
                "GET",
                f"/ingestion/{source_id}?project_id={project_id}",
                headers={"X-API-Key": api_key_value},
            ).json()
            status = status_resp["status"]
            print("Status:", status)
            if status in {"completed", "failed"}:
                break
            time.sleep(2)
        if status != "completed":
            print("Ingestion not completed. Is the worker running?")

        _print_step("Chat")
        chat = _request(
            client,
            "POST",
            f"/projects/{project_id}/chat",
            json={"query": "What is this document about?"},
            headers={"X-API-Key": api_key_value},
        ).json()
        print("Chat response:", chat.get("response"))
        conversation_id = chat.get("conversation_id")
        print("Conversation:", conversation_id)

        _print_step("Usage")
        usage = _request(
            client,
            "GET",
            f"/usage?project_id={project_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        ).json()
        print("Usage:", json.dumps(usage))

        _print_step("Widget Token")
        widget = _request(
            client,
            "POST",
            "/tokens/widget",
            json={"origin": WIDGET_ORIGIN, "project_id": project_id},
            headers={"X-API-Key": api_key_value},
        ).json()
        widget_token = widget["token"]
        print("Widget token issued")

        _print_step("Widget Metrics")
        _request(
            client,
            "POST",
            "/metrics/widget",
            json={"metrics": [{"name": "widget_load_time", "value": 420}]},
            headers={
                "Authorization": f"Bearer {widget_token}",
                "Origin": WIDGET_ORIGIN,
            },
        )
        print("Widget metrics accepted")

        _print_step("Widget Token Refresh")
        refresh = _request(
            client,
            "POST",
            "/tokens/refresh",
            headers={
                "Authorization": f"Bearer {widget_token}",
                "Origin": WIDGET_ORIGIN,
            },
        ).json()
        print("Refreshed token issued")

    print("\nFlow complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
