# Sources Endpoints

Sources are documents (files or URLs) that are ingested and indexed for chat.

## POST /sources/upload

Upload a file to be processed.

**Headers:**
```
X-API-Key: <project_api_key>
```

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | PDF, TXT, MD, or DOCX |

**Response (202):**
```json
{
  "id": "src_123",
  "type": "file",
  "status": "processing",
  "metadata": {
    "filename": "document.pdf",
    "size": 1024000
  },
  "created_at": "2026-02-13T10:00:00Z"
}
```

## POST /sources/url

Add a URL to be scraped and processed.

**Headers:**
```
X-API-Key: <project_api_key>
```

**Request:**
```json
{
  "url": "https://example.com/support"
}
```

**Response (202):**
```json
{
  "id": "src_456",
  "type": "url",
  "status": "processing",
  "metadata": {
    "url": "https://example.com/support",
    "title": "Support Page"
  },
  "created_at": "2026-02-13T10:00:00Z"
}
```

## GET /sources/{id}

Get source details and status.

**Headers:**
```
Authorization: Bearer <jwt>
```

or

```
X-API-Key: <project_api_key>
```

**Response (200):**
```json
{
  "id": "src_123",
  "type": "file",
  "status": "completed",
  "metadata": {
    "filename": "document.pdf",
    "size": 1024000,
    "title": "Product Documentation",
    "pages": 45
  },
  "chunks_count": 128,
  "error_message": null,
  "created_at": "2026-02-13T10:00:00Z",
  "completed_at": "2026-02-13T10:01:30Z"
}
```

## Source Status

| Status | Description |
|--------|-------------|
| `pending` | Waiting to be processed |
| `processing` | Currently being parsed/chunked |
| `completed` | Successfully indexed |
| `failed` | Processing failed |

## GET /sources/{id}/chunks

Get chunks from a source.

**Response (200):**
```json
{
  "items": [
    {
      "id": "chunk_1",
      "text": "First chunk content...",
      "metadata": {
        "chunk_index": 0,
        "page_number": 1,
        "section_title": "Introduction"
      }
    }
  ],
  "total": 128,
  "limit": 50,
  "offset": 0
}
```

## DELETE /sources/{id}

Delete a source and its chunks.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (204):** No content

This will also delete all associated chunks and embeddings.

## Processing Time

Processing time depends on:
- Document size
- Number of pages (PDF)
- Complexity of content

Average: 10-30 seconds for small documents.

## Supported File Types

| Type | Extension | Notes |
|------|-----------|-------|
| PDF | .pdf | Up to 1000 pages |
| Markdown | .md | |
| Text | .txt | |
| HTML | .html, .htm | |

## Web Scraping

For URL sources:
- Extracts main navigation content
- Removes/footer
- Converts to markdown
- Follows internal links (configurable)
