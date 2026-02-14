# API Reference

The RAG Chatbot Platform REST API.

## Overview

Base URL: `https://api.yourdomain.com/v1`

All endpoints require authentication unless noted otherwise.

## OpenAPI Specification

The full API specification is available at:

- **JSON**: `/v1/openapi.json`
- **Swagger UI**: `/v1/docs`
- **ReDoc**: `/v1/redoc`

## Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User login |
| `/auth/register` | POST | User registration |
| `/projects` | GET | List projects |
| `/projects` | POST | Create project |
| `/projects/{id}` | GET | Get project |
| `/sources` | POST | Create source |
| `/sources/upload` | POST | Upload file |
| `/sources/url` | POST | Add URL source |
| `/projects/{id}/chat` | POST | Send chat message |
| `/tokens/widget` | POST | Generate widget token |
| `/tokens/refresh` | POST | Refresh token |
| `/usage` | GET | Get usage stats |
| `/health` | GET | Health check |

## Authentication

All API requests require authentication. See [Authentication Guide](../guides/authentication.md).

```bash
# User JWT
-H "Authorization: Bearer eyJhbGci..."

# API Key
-H "X-API-Key: chat_xyz..."

# Widget Token
-H "Authorization: Bearer eyJhbGci..."
```

## Rate Limiting

Rate limits are enforced per API key/token:

| Endpoint | Limit |
|----------|-------|
| General | 60/min |
| Chat | 60/min |
| Ingestion | 10/min |
| Token refresh | 30/min |

## Error Responses

```json
{
  "detail": "Error message"
}
```

Common status codes:

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

## Pagination

List endpoints support pagination:

```bash
GET /projects?limit=20&offset=0
```

Response:
```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

## Versioning

The API uses URL versioning:

```
/v1/projects
/v1/chat
```

The `Accept-Version` header can also be used:
```
Accept-Version: v1
```
