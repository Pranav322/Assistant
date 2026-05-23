import uuid
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core import security
from app.models import User

# Mock payload for the endpoint
MOCK_ID_TOKEN = "mock_firebase_id_token"


@pytest.fixture
def mock_verify_id_token():
    with patch("app.api.v1.endpoints.auth_firebase.verify_id_token") as mock:
        yield mock


@pytest.mark.asyncio
async def test_firebase_login_new_user(client: AsyncClient, db, mock_verify_id_token):
    """Test logging in with a new user via Firebase."""
    email = f"newuser_{uuid.uuid4()}@example.com"
    # Setup mock to return a valid token payload for a new user
    mock_verify_id_token.return_value = {
        "uid": "firebase_uid_123",
        "email": email,
        "email_verified": True,
    }

    response = await client.post(
        "/api/v1/auth/firebase", json={"id_token": MOCK_ID_TOKEN}
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Verify user was created in DB
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.email == email
    assert user.email_verified is True
    # Verify password_hash is None (handled by Firebase)
    assert user.password_hash is None


@pytest.mark.asyncio
async def test_firebase_login_existing_user(
    client: AsyncClient, db, mock_verify_id_token
):
    """Test logging in with an existing user via Firebase."""
    email = f"existing_{uuid.uuid4()}@example.com"
    # Create an existing user
    existing_user = User(email=email, password_hash="somehash", email_verified=False)
    db.add(existing_user)
    await db.commit()
    await db.refresh(existing_user)
    old_last_login = existing_user.last_login_at

    # Setup mock to return payload for existing email
    mock_verify_id_token.return_value = {
        "uid": "firebase_uid_456",
        "email": email,
        "email_verified": True,
    }

    response = await client.post(
        "/api/v1/auth/firebase", json={"id_token": MOCK_ID_TOKEN}
    )

    assert response.status_code == 200

    # Verify user data updated
    await db.refresh(existing_user)
    assert existing_user.email_verified is True  # Should update to True from token
    assert existing_user.last_login_at != old_last_login


@pytest.mark.asyncio
async def test_firebase_login_invalid_token(client: AsyncClient, mock_verify_id_token):
    """Test login with invalid Firebase token."""
    mock_verify_id_token.side_effect = ValueError("Invalid token")

    response = await client.post(
        "/api/v1/auth/firebase", json={"id_token": "invalid_token"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication token"


@pytest.mark.asyncio
async def test_firebase_login_no_email(client: AsyncClient, mock_verify_id_token):
    """Test login where Firebase token doesn't have email."""
    mock_verify_id_token.return_value = {
        "uid": "firebase_uid_789",
        # No email
    }

    response = await client.post(
        "/api/v1/auth/firebase", json={"id_token": MOCK_ID_TOKEN}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Token must contain an email address"
