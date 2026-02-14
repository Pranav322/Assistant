# Project Endpoints

## GET /projects

List all projects for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 20 | Max items to return |
| `offset` | int | 0 | Pagination offset |

**Response (200):**
```json
{
  "items": [
    {
      "id": "proj_123",
      "name": "My Support Bot",
      "description": "Customer support chatbot",
      "allowed_origins": ["https://example.com"],
      "settings": {
        "chunking": {
          "chunk_size": 384
        }
      },
      "usage": {
        "requests": 1500,
        "tokens_total": 125000,
        "tokens_today": 450
      },
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-02-13T09:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

## POST /projects

Create a new project.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Request:**
```json
{
  "name": "My Support Bot",
  "description": "Customer support chatbot",
  "allowed_origins": ["https://example.com"]
}
```

**Response (201):**
```json
{
  "id": "proj_456",
  "name": "My Support Bot",
  "description": "Customer support chatbot",
  "allowed_origins": ["https://example.com"],
  "settings": {},
  "usage": {
    "requests": 0,
    "tokens_total": 0,
    "tokens_today": 0
  },
  "created_at": "2026-02-13T10:00:00Z",
  "updated_at": "2026-02-13T10:00:00Z"
}
```

## GET /projects/{id}

Get a specific project.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "id": "proj_123",
  "name": "My Support Bot",
  "description": "Customer support chatbot",
  "allowed_origins": ["https://example.com"],
  "settings": {
    "chunking": {
      "chunk_size": 384
    }
  },
  "usage": {
    "requests": 1500,
    "tokens_total": 125000,
    "tokens_today": 450
  },
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-02-13T09:00:00Z"
}
```

## PATCH /projects/{id}

Update a project.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Request:**
```json
{
  "name": "Updated Name",
  "allowed_origins": ["https://example.com", "https://staging.example.com"]
}
```

**Response (200):**
```json
{
  "id": "proj_123",
  "name": "Updated Name",
  "allowed_origins": ["https://example.com", "https://staging.example.com"],
  ...
}
```

## DELETE /projects/{id}

Delete a project.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (204):** No content

## GET /projects/{id}/sources

List all sources in a project.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "src_123",
      "type": "file",
      "status": "completed",
      "metadata": {
        "title": "FAQ Document",
        "filename": "faq.pdf"
      },
      "chunks_count": 45,
      "created_at": "2026-02-10T10:00:00Z"
    }
  ],
  "total": 1
}
```
