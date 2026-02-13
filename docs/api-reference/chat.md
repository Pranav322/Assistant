# Chat Endpoints

## POST /projects/{project_id}/chat

Send a chat message and get a response.

**Headers:**
```
Authorization: Bearer <widget_token>
```

**Request:**
```json
{
  "query": "What is your return policy?",
  "conversation_id": "conv_123",
  "stream": false
}
```

**Response (200):**
```json
{
  "response": "Our return policy allows returns within 30 days of purchase...",
  "conversation_id": "conv_123",
  "citations": [
    {
      "id": 1,
      "source_id": "src_123",
      "title": "FAQ Document",
      "text": "You may return any item within 30 days..."
    }
  ],
  "metadata": {
    "retrieval_time_ms": 145,
    "total_time_ms": 892
  }
}
```

## Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | User message |
| `conversation_id` | string | No | Conversation ID for context |
| `stream` | boolean | No | Enable streaming (not implemented) |
| `history` | array | No | Explicit conversation history |

## Streaming Response

When `stream: true`:

```json
{
  "type": "chunk",
  "content": "Our return "
}
---
{
  "type": "chunk", 
  "content": "policy allows "
}
---
{
  "type": "done",
  "citations": [...]
}
```

## Error Responses

### 401 - Token Expired
```json
{
  "detail": "Token expired"
}
```

### 403 - Origin Mismatch
```json
{
  "detail": "Origin not allowed"
}
```

### 429 - Rate Limited
```json
{
  "detail": "Rate limit exceeded. Try again later."
}
```

## Conversation Context

The API maintains conversation context automatically:

```json
{
  "query": "Tell me more",
  "conversation_id": "conv_123"
}
```

The system will use previous messages in `conv_123` for context.

## Manual History

Pass history explicitly:

```json
{
  "query": "What about electronics?",
  "history": [
    {"role": "user", "content": "What's your return policy?"},
    {"role": "assistant", "content": "Our return policy allows..."}
  ]
}
```

## Citations

Citations include source information:

```json
{
  "citations": [
    {
      "id": 1,
      "source_id": "src_123",
      "title": "FAQ Document",
      "page": 3,
      "section": "Returns",
      "text": "You may return any item within 30 days..."
    }
  ]
}
```
