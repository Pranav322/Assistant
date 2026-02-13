# Authentication

Understanding the authentication system.

## Overview

The platform uses three types of credentials for different use cases:

| Credential | Use Case | Lifespan |
|------------|----------|----------|
| User JWT | Dashboard access | Session-based |
| API Key | Server operations | Long-lived |
| Widget Token | Browser chat | Short-lived (24h) |

## User JWT (Dashboard)

Issued when users log in. Used for:
- Project management
- Dashboard operations
- Preview widget tokens

### Login

```bash
curl -X POST "https://api.yourdomain.com/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### Using the Token

Include in Authorization header:

```bash
curl "https://api.yourdomain.com/v1/projects" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Token Contents

```json
{
  "sub": "user_id",
  "project_id": "optional_default_project",
  "email": "user@example.com",
  "exp": 1234567890,
  "iss": "rag-chatbot",
  "aud": "rag-chatbot"
}
```

## API Keys

Long-lived secrets for server-side operations. See [API Keys Guide](api-keys.md).

## Widget Tokens

Short-lived JWTs for browser-based chat.

### Generation

```bash
curl -X POST "https://api.yourdomain.com/v1/tokens/widget" \
  -H "X-API-Key: chat_project_key" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "proj_123", "origin": "https://example.com"}'
```

### Token Contents

```json
{
  "sub": "project_id",
  "origin": "https://example.com",
  "type": "widget",
  "exp": 1234567890,
  "iss": "rag-chatbot"
}
```

### Validation

The API validates:
1. Token signature
2. Expiration
3. Origin matches request origin

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Dashboard   │    │    Widget    │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                    │                           │
│         │ JWT                │ Widget Token              │
└─────────┼────────────────────┼───────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                       API                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Validate JWT → Dashboard Operations            │  │
│  │  Validate API Key → Server Operations            │  │
│  │  Validate Widget Token → Chat                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Password Requirements

- Minimum 8 characters
- Stored securely with bcrypt/argon2

## Token Refresh

### User JWT

```bash
curl -X POST "https://api.yourdomain.com/v1/auth/refresh" \
  -H "Authorization: Bearer old_token"
```

### Widget Token

The widget auto-refreshes ~5 minutes before expiration:

```javascript
// Widget code handles this automatically
// Optionally listen for chatbot:token_expired event
```

## Logout

```bash
curl -X POST "https://api.yourdomain.com/v1/auth/logout" \
  -H "Authorization: Bearer your_token"
```

This invalidates the token server-side.

## Best Practices

1. **Never expose secrets in frontend code**
2. **Use HTTPS always**
3. **Rotate credentials regularly**
4. **Use short-lived tokens where possible**
5. **Implement token refresh logic**

## Troubleshooting

### Token Expired (401)

- User JWT: Re-login
- Widget Token: Use refresh endpoint

### Invalid Signature

- Check JWT_SECRET matches server
- Verify token wasn't tampered

### Origin Mismatch

- Ensure origin is in allowed origins
- Check origin header in request
