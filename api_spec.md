# API SPECIFICATION
**Version:** 1.0.1
**Aligned with:** schema.sql v2.2, security.md v3.0, retrieval.md v1.0
**Base URL:** `https://api.chatbot.com/v1`
**Authentication:** API Key or JWT Token
**Format:** JSON (application/json)

---

## **📋 OVERVIEW**

This API powers the RAG chatbot platform. All endpoints require authentication via API key (for server-to-server) or JWT token (for browser widgets). Rate limiting is applied per API key.

### **Authentication Headers:**
```http
# For API keys (admin, ingestion, programmatic access)
X-API-Key: chat_kF3mN9pQw8vXzY2aB5cD1eR7tU6iO4sL

# For browser tokens (iframe widgets)
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### **Rate Limits:**
- **API Key:** 60 requests/minute, 100,000 tokens/minute
- **JWT Token:** Follows endpoint limits (chat: 30 rpm, ingestion: 10 rpm, token refresh: 1000 rpm)

### **Response Headers:**
```http
X-RateLimit-Limit: Maximum requests per minute
X-RateLimit-Remaining: Remaining requests in window
X-RateLimit-Reset: Unix timestamp when limit resets
```

### **Error Responses:**
All errors return JSON with structure:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid or expired API key",
    "details": {},
    "request_id": "req_123abc",
    "timestamp": "2026-02-12T10:30:00Z"
  }
}
```

### **Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_api_key` | 401 | API key missing, invalid, or expired |
| `rate_limit_exceeded` | 429 | Too many requests |
| `validation_error` | 400 | Request validation failed |
| `not_found` | 404 | Resource not found |
| `permission_denied` | 403 | Insufficient permissions |
| `insufficient_quota` | 402 | Project quota exceeded |
| `processing_error` | 500 | Background job failed |

---

## **🔐 AUTHENTICATION ENDPOINTS**

### **POST /tokens/widget**
Generate JWT token for browser widget

**Request:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "origin": "https://customer.com"
}
```

**Response (200):**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 86400,
  "expires_at": "2026-02-13T10:30:00Z"
}
```

**Response (403):**
```json
{
  "error": {
    "code": "origin_not_allowed",
    "message": "Origin https://customer.com not in allowed origins"
  }
}
```

### **POST /tokens/refresh**
Refresh expiring JWT token

**Request:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "origin": "https://customer.com"
}
```

**Response:** Same as `/tokens/widget`

---

## **🏢 PROJECT MANAGEMENT**

### **GET /projects**
List projects for authenticated user

**Query Parameters:**
- `page` (integer, default: 1) — Page number
- `limit` (integer, default: 20, max: 100) — Items per page
- `include_inactive` (boolean, default: false) — Include inactive projects

**Response (200):**
```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Customer Support Docs",
      "allowed_origins": ["https://support.customer.com"],
      "settings": {
        "chunk_size": 384,
        "embedding_model": "text-embedding-3-small"
      },
      "usage": {
        "sources": 24,
        "chunks": 12876,
        "conversations": 432,
        "tokens_used": 1543200
      },
      "is_active": true,
      "created_at": "2026-01-15T08:30:00Z",
      "updated_at": "2026-02-10T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### **POST /projects**
Create a new project

**Request:**
```json
{
  "name": "Product Documentation",
  "allowed_origins": ["https://docs.company.com"],
  "settings": {
    "chunk_size": 512,
    "embedding_model": "text-embedding-3-small",
    "llm_model": "gpt-4o-mini"
  }
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Product Documentation",
  "api_key": {
    "key": "chat_kF3mN9pQw8vXzY2aB5cD1eR7tU6iO4sL",
    "id": "660e8400-e29b-41d4-a716-446655440001"
  },
  "settings": {
    "chunk_size": 512,
    "embedding_model": "text-embedding-3-small",
    "llm_model": "gpt-4o-mini"
  },
  "created_at": "2026-02-12T10:30:00Z"
}
```

### **GET /projects/{id}**
Get project details

**Response (200):** Same as project object in list, plus:
```json
{
  "id": "...",
  "name": "...",
  "stats": {
    "today": {
      "queries": 42,
      "tokens": 12000
    },
    "last_7_days": {
      "queries": 312,
      "tokens": 89000
    }
  }
}
```

### **PUT /projects/{id}**
Update project settings

**Request:**
```json
{
  "name": "Updated Project Name",
  "allowed_origins": ["https://new.domain.com"],
  "settings": {
    "chunk_size": 256
  }
}
```

**Response (200):** Updated project object

### **DELETE /projects/{id}**
Soft delete project

**Query Parameters:**
- `confirm` (boolean, required) — Must be true to confirm deletion

**Response (202):**
```json
{
  "status": "scheduled",
  "deletion_date": "2026-03-14T10:30:00Z",
  "message": "Project will be permanently deleted after 30 days"
}
```

---

## **🔑 API KEY MANAGEMENT**

### **GET /projects/{project_id}/keys**
List API keys for project

**Response (200):**
```json
{
  "keys": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Production Widget",
      "allowed_origins": ["https://customer.com"],
      "scopes": ["ingest", "query"],
      "created_at": "2026-01-15T08:30:00Z",
      "expires_at": null,
      "revoked_at": null
    }
  ]
}
```

### **POST /projects/{project_id}/keys**
Create new API key

**Request:**
```json
{
  "name": "Backend Integration",
  "allowed_origins": [],
  "scopes": ["ingest", "query", "admin"],
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "key": "chat_abc123def456ghi789jkl012mno345pqr678",
  "id": "660e8400-e29b-41d4-a716-446655440002",
  "name": "Backend Integration",
  "created_at": "2026-02-12T10:30:00Z",
  "expires_at": "2027-02-11T10:30:00Z"
}
```

### **DELETE /projects/{project_id}/keys/{key_id}**
Revoke API key

**Response (200):**
```json
{
  "status": "revoked",
  "revoked_at": "2026-02-12T10:30:00Z"
}
```

---

## **📁 SOURCE MANAGEMENT**

### **POST /projects/{project_id}/sources/upload**
Upload a file (PDF, TXT, Markdown)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (required) — File to upload
- `type` (optional) — `pdf`, `text`, `markdown` (auto-detected)
- `metadata` (optional, JSON string) — Additional metadata

**Response (202):**
```json
{
  "source_id": "770e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "File uploaded, processing started",
  "estimated_completion": "2026-02-12T10:31:00Z"
}
```

### **POST /projects/{project_id}/sources/url**
Ingest content from URL

**Request:**
```json
{
  "url": "https://docs.company.com/getting-started",
  "metadata": {
    "title": "Getting Started Guide"
  }
}
```

**Response (202):** Same as upload endpoint

### **GET /projects/{project_id}/sources**
List sources with filtering

**Query Parameters:**
- `page`, `limit` — Pagination
- `status` — Filter by status: `pending`, `processing`, `completed`, `failed`
- `type` — Filter by type: `pdf`, `url`, `text`, `markdown`
- `search` — Search in filename/URL

**Response (200):**
```json
{
  "sources": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "type": "pdf",
      "storage_location": "projects/abc/sources/xyz.pdf",
      "metadata": {
        "title": "User Manual",
        "page_count": 45,
        "word_count": 12000,
        "processed_at": "2026-02-12T09:30:00Z"
      },
      "status": "completed",
      "created_at": "2026-02-12T09:15:00Z",
      "updated_at": "2026-02-12T09:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 24, "pages": 2 }
}
```

### **GET /projects/{project_id}/sources/{source_id}**
Get source details including chunks

**Response (200):**
```json
{
  "source": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "type": "pdf",
    "metadata": {},
    "chunks": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "text": "First paragraph...",
        "metadata": {
          "chunk_index": 0,
          "token_count": 127,
          "page_number": 1,
          "section_title": "Introduction"
        },
        "created_at": "2026-02-12T09:30:00Z"
      }
    ]
  }
}
```

### **DELETE /projects/{project_id}/sources/{source_id}**
Delete source and all its chunks

**Query Parameters:**
- `confirm` (boolean, required) — Must be true

**Response (200):**
```json
{
  "status": "deleted",
  "chunks_deleted": 312,
  "embeddings_deleted": 312
}
```

---

## **💬 CHAT ENDPOINTS**

### **POST /projects/{project_id}/chat**
Send message and get response

**Request:**
```json
{
  "query": "How do I reset my password?",
  "conversation_id": "990e8400-e29b-41d4-a716-446655440000",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "max_tokens": 1000,
    "include_citations": true,
    "include_retrieved_chunks": false
  }
}
```

**Response (200, non-streaming):**
```json
{
  "response": "To reset your password, go to Settings > Security > Reset Password...",
  "conversation_id": "990e8400-e29b-41d4-a716-446655440000",
  "message_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "citations": [
    {
      "id": 1,
      "chunk_id": "880e8400-e29b-41d4-a716-446655440000",
      "source_id": "770e8400-e29b-41d4-a716-446655440000",
      "title": "User Manual",
      "page": 12,
      "text_preview": "Password reset can be done through...",
      "confidence": 0.92
    }
  ],
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 87,
    "total_tokens": 332,
    "estimated_cost": 0.00083
  },
  "metadata": {
    "retrieval_time_ms": 145,
    "llm_time_ms": 1234,
    "chunks_retrieved": 8,
    "chunks_used": 3
  }
}
```

**Streaming Response (SSE):**
When `stream: true`, returns Server-Sent Events:

```text
event: message
data: {"type": "chunk", "content": "To reset"}

event: message
data: {"type": "chunk", "content": " your password"}

event: done
data: {"message_id": "...", "usage": {...}}
```

### **GET /projects/{project_id}/conversations**
List conversations

**Query Parameters:**
- `page`, `limit` — Pagination
- `since` — Only conversations after timestamp
- `until` — Only conversations before timestamp

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "session_id": "session_abc123",
      "message_count": 5,
      "token_usage": {
        "total": 1543,
        "prompt": 1024,
        "completion": 519
      },
      "started_at": "2026-02-12T09:15:00Z",
      "last_message_at": "2026-02-12T09:18:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "pages": 3 }
}
```

### **GET /projects/{project_id}/conversations/{conversation_id}**
Get conversation with messages

**Response (200):**
```json
{
  "conversation": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "session_id": "session_abc123",
    "messages": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440000",
        "role": "user",
        "content": "How do I reset my password?",
        "token_count": 12,
        "created_at": "2026-02-12T09:15:00Z"
      },
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440001",
        "role": "assistant",
        "content": "To reset your password...",
        "token_count": 87,
        "metadata": {
          "citations": [],
          "model": "gpt-4o-mini"
        },
        "created_at": "2026-02-12T09:15:02Z"
      }
    ]
  }
}
```

### **DELETE /projects/{project_id}/conversations/{conversation_id}**
Delete conversation

**Response (200):**
```json
{
  "status": "deleted",
  "messages_deleted": 5
}
```

---

## **⚙️ SYSTEM ENDPOINTS**

### **GET /health**
Health check

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected"
  }
}
```

### **GET /metrics**
Prometheus metrics

**Response (200):** Plain text Prometheus format

### **GET /usage**
Get usage statistics for API key

**Response (200):**
```json
{
  "limits": {
    "requests_per_minute": 60,
    "tokens_per_minute": 100000,
    "requests_per_day": 50000,
    "tokens_per_day": 5000000
  },
  "usage": {
    "current_minute": {
      "requests": 12,
      "tokens": 4500
    },
    "current_day": {
      "requests": 423,
      "tokens": 154000
    }
  }
}
```

---

## **🛠️ ADMIN ENDPOINTS**
*(Requires admin scope)*

### **POST /admin/projects/{project_id}/reindex**
Re-index all chunks (regenerate embeddings)

**Request:**
```json
{
  "embedding_model": "text-embedding-3-small",
  "batch_size": 100,
  "force": false
}
```

**Response (202):**
```json
{
  "job_id": "job_abc123",
  "status": "started",
  "estimated_chunks": 12000,
  "estimated_time": "2026-02-12T11:30:00Z"
}
```

### **GET /admin/queue/stats**
Get background job queue statistics

**Response (200):**
```json
{
  "queues": {
    "ingestion": {
      "waiting": 3,
      "active": 2,
      "completed": 142,
      "failed": 1
    },
    "embedding": {
      "waiting": 12,
      "active": 5,
      "completed": 3124,
      "failed": 0
    }
  }
}
```

### **GET /admin/audit/logs**
Get audit logs (admin only)

**Query Parameters:**
- `project_id` — Filter by project
- `action` — Filter by action type
- `since`, `until` — Time range
- `limit` — Max results (default: 100)

**Response (200):**
```json
{
  "logs": [
    {
      "id": "audit_123",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "110e8400-e29b-41d4-a716-446655440000",
      "action": "api_key_created",
      "resource_type": "api_key",
      "resource_id": "660e8400-e29b-41d4-a716-446655440001",
      "detail": {
        "name": "Production Key",
        "scopes": ["ingest", "query"]
      },
      "ip_address": "192.168.1.1",
      "user_agent": "curl/7.68.0",
      "created_at": "2026-02-12T10:30:00Z"
    }
  ]
}
```

---

## **🔍 SEARCH ENDPOINTS**

### **POST /projects/{project_id}/search**
Search chunks directly (bypass LLM)

**Request:**
```json
{
  "query": "password reset procedure",
  "limit": 10,
  "filters": {
    "source_ids": ["770e8400-e29b-41d4-a716-446655440000"],
    "min_date": "2026-01-01",
    "max_date": "2026-02-12"
  }
}
```

**Response (200):**
```json
{
  "results": [
    {
      "chunk_id": "880e8400-e29b-41d4-a716-446655440000",
      "text": "To reset your password, navigate to...",
      "score": 0.92,
      "source": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "title": "User Manual",
        "page": 12
      },
      "metadata": {
        "section_title": "Password Management"
      }
    }
  ]
}
```

---

## **🚨 ERROR CODES REFERENCE**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_api_key` | 401 | API key missing, invalid, or expired |
| `invalid_token` | 401 | JWT token invalid or expired |
| `permission_denied` | 403 | Insufficient permissions for resource |
| `origin_not_allowed` | 403 | Origin not in allowed origins |
| `rate_limit_exceeded` | 429 | Rate limit exceeded |
| `validation_error` | 400 | Request validation failed |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict (e.g., duplicate) |
| `insufficient_quota` | 402 | Project quota exceeded (if paid) |
| `processing_error` | 500 | Background processing failed |
| `service_unavailable` | 503 | Service temporarily unavailable |

---

## **📝 REQUEST IDS**

All responses include a `X-Request-ID` header for tracking:

```text
X-Request-ID: req_abc123def456
```

Include this ID in support requests.
