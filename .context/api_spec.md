# API SPECIFICATION
**Version:** 1.2.0
**Aligned with:** schema.sql v2.2, security.md v3.0, widget_protocol.md v1.2.0
**Last Updated:** 2026-04-24

---

## Overview

All endpoints require authentication. Rate limiting is enforced per key or token.

- Base URL: `https://api.chatbot.com/v1`
- Versioning: `Accept-Version: v1` (optional, defaults to v1)

---

## Authentication Endpoints

### POST `/tokens/widget`

Generate JWT token for browser widget (API key flow).

Request:

```json
{
  "origin": "https://customer.com",
  "project_id": "uuid"
}
```

Response:

```json
{
  "token": "JWT",
  "expires_in": 86400
}
```

### POST `/tokens/widget/user`

Generate JWT token for browser widget (dashboard user flow).

Request/Response shape is same as `/tokens/widget`.

### POST `/tokens/refresh`

Refresh an existing widget JWT.

Headers:

- `Authorization: Bearer <widget_token>`
- `Origin: https://customer.com`

Response:

```json
{
  "token": "JWT",
  "expires_in": 86400
}
```

Behavior:

- Validates signature, expiry, audience, issuer, origin.
- Revokes old token record and issues a new token record.

---

## Project Management

### GET `/projects`
List projects.

### POST `/projects`
Create project.

### GET `/projects/{id}`
Get project details.

---

## Chat Endpoints

### POST `/projects/{project_id}/chat`

Send message and get response.

Request:

```json
{
  "query": "Hello",
  "conversation_id": "uuid",
  "stream": false
}
```

Response:

```json
{
  "response": "Hi there!",
  "citations": [],
  "conversation_id": "uuid"
}
```

Notes:

- `conversation_id` in response is recommended when server creates or rotates conversation context.
- `citations` should be present as an array (possibly empty) for consistent client rendering.

---

## Widget Metrics Endpoint

### POST `/metrics/widget`

Ingest batched Real User Monitoring (RUM) metrics from widget clients.

Request:

```json
{
  "metrics": [
    { "name": "widget_load_time", "value": 300, "tags": { "browser": "chrome" } }
  ]
}
```

Response:

- `202 Accepted`

Auth:

- Widget bearer token required.
- Origin validation required.

---

## System & Observability Endpoints

### GET `/health`
Quick liveness check. Returns `{ "status": "ok" }`.

### GET `/health/ready`
Readiness check (DB, Redis, S3). Returns `{ "status": "ready" }` or 503.

### GET `/admin/projects/{project_id}/metrics/retrieval`
Retrieval performance metrics for admin dashboard.

Example response:

```json
{
  "avg_latency_ms": 145,
  "p95_latency_ms": 450,
  "total_queries": 1200
}
```

### GET `/usage`
Current API usage stats.

```json
{
  "requests": 145,
  "tokens": 12400
}
```
