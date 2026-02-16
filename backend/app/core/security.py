import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from urllib.parse import urlparse

import bcrypt
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

ALGORITHM = "HS256"
API_KEY_PREFIX = "chat_"
API_KEY_TOKEN_LENGTH = 32


def create_access_token(
    subject: Union[str, Any],
    expires_delta: timedelta | None = None,
    token_type: str = "user_token",
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": token_type,
        "iss": settings.JWT_ISSUER,
        "aud": settings.USER_JWT_AUDIENCE,
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def decode_user_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[ALGORITHM],
        audience=settings.USER_JWT_AUDIENCE,
        issuer=settings.JWT_ISSUER,
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_api_key() -> str:
    token = secrets.token_urlsafe(24)[:API_KEY_TOKEN_LENGTH]
    return f"{API_KEY_PREFIX}{token}"


def hash_api_key(api_key: str) -> str:
    hashed = bcrypt.hashpw(api_key.encode(), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    return bcrypt.checkpw(provided_key.encode(), stored_hash.encode())


def get_api_key_fast_hash(api_key: str) -> str:
    """
    Returns a fast hash (SHA256) of the API key for O(1) lookup.
    This is NOT secure for password storage, but safe for looking up
    high-entropy random keys before verifying them with bcrypt.
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def hash_widget_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_widget_token(
    project_id: str,
    origins: list[str],
    token_id: str | None = None,
    expires_in_seconds: int | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expires_in = expires_in_seconds or settings.WIDGET_TOKEN_EXPIRE_SECONDS
    exp = now + timedelta(seconds=expires_in)
    jti = token_id or str(uuid.uuid4())
    payload = {
        "sub": project_id,
        "type": "widget_token",
        "origins": origins,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": jti,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_widget_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[ALGORITHM],
        audience=settings.JWT_AUDIENCE,
        issuer=settings.JWT_ISSUER,
    )


def normalize_origin(origin: str) -> str:
    cleaned = origin.strip().rstrip("/")
    if not cleaned:
        return cleaned
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned
    if cleaned.startswith("localhost") or cleaned.startswith("127.0.0.1"):
        return f"http://{cleaned}"
    return f"https://{cleaned}"


def validate_origin(request_origin: str | None, allowed_origins: list[str]) -> bool:
    if not request_origin:
        return False

    if settings.ENVIRONMENT == "development" and "*" in allowed_origins:
        return True

    request_origin = normalize_origin(request_origin)
    parsed = urlparse(request_origin)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False

    normalized_allowed = [normalize_origin(origin) for origin in allowed_origins]

    for allowed in normalized_allowed:
        if allowed == request_origin:
            return True
        if allowed.startswith("https://*.") and request_origin.startswith("https://"):
            domain = allowed[11:]
            if request_origin.endswith(domain):
                return True

    return False


def generate_csp(allowed_origins: list[str]) -> str:
    frame_ancestors = " ".join(["'self'"] + allowed_origins)
    return (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        f"frame-ancestors {frame_ancestors}; "
        "form-action 'none';"
    )


def redact_sensitive(data: dict[str, Any]) -> dict[str, Any]:
    redacted = dict(data)
    for key in ["api_key", "password", "token", "secret"]:
        if key in redacted:
            redacted[key] = "[REDACTED]"

    email = redacted.get("email")
    if isinstance(email, str) and "@" in email:
        name, domain = email.split("@", 1)
        if len(name) > 2:
            masked = name[0] + "*" * (len(name) - 2) + name[-1]
            redacted["email"] = f"{masked}@{domain}"

    return redacted
