# Authentication Endpoints

## POST /auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-02-13T10:00:00Z"
}
```

## POST /auth/login

Login and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

## POST /auth/logout

Logout and invalidate token.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

## POST /auth/refresh

Refresh an access token.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

## POST /auth/request-password-reset

Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

## POST /auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newsecurepassword"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```
