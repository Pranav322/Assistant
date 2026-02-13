import { Markdown } from "@/components/markdown";

const content = `# API Reference

The RAG Chatbot Platform REST API.

## Overview

Base URL: \`https://api.yourdomain.com/v1\`

All endpoints require authentication unless noted otherwise.

## Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/auth/login\` | POST | User login |
| \`/auth/register\` | POST | User registration |
| \`/projects\` | GET | List projects |
| \`/projects\` | POST | Create project |
| \`/projects/{id}\` | GET | Get project |
| \`/sources\` | POST | Create source |
| \`/projects/{id}/chat\` | POST | Send chat message |
| \`/tokens/widget\` | POST | Generate widget token |
| \`/health\` | GET | Health check |

## Authentication

\`\`\`bash
# User JWT
-H "Authorization: Bearer eyJhbGci..."

# API Key
-H "X-API-Key: chat_xyz..."

# Widget Token
-H "Authorization: Bearer eyJhbGci..."
\`\`\`

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| General | 60/min |
| Chat | 60/min |
| Ingestion | 10/min |

## Error Responses

\`\`\`json
{
  "detail": "Error message"
}
\`\`\`

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

\`\`\`bash
GET /projects?limit=20&offset=0
\`\`\`

## Versioning

\`\`\`
/v1/projects
/v1/chat
\`\`\`
`;

export default function APIReferencePage() {
  return <Markdown>{content}</Markdown>;
}
