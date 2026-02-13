import { Markdown } from "@/components/markdown";

const content = `# API Keys

Guide to creating and managing API keys.

## Overview

API keys are long-lived secrets used for server-side operations:
- Ingesting documents (uploading files/URLs)
- Minting widget tokens
- Administrative operations

## Creating API Keys

### Via Dashboard

1. Navigate to your project
2. Go to **Settings** > **API Keys**
3. Click **Create API Key**
4. Copy the key immediately (shown once)

### Via API

\`\`\`bash
curl -X POST "https://api.yourdomain.com/v1/api-keys" \\
  -H "Authorization: Bearer your-user-jwt" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Key",
    "expires_at": "2026-12-31T23:59:59Z"
  }'
\`\`\`

## Using API Keys

Include the key in the \`X-API-Key\` header:

\`\`\`bash
curl "https://api.yourdomain.com/v1/sources" \\
  -H "X-API-Key: chat_xyz789..."
\`\`\`

## Key Types

### Project API Keys

Standard keys for project operations:
- Document ingestion
- Widget token minting

### Admin API Keys

System-level operations (set via environment variable):
\`\`\`bash
ADMIN_API_KEY="admin_secret_key"
\`\`\`

## Security Best Practices

### Never Expose API Keys

- **Never** put API keys in client-side code
- **Never** commit keys to git
- **Never** log keys

### Use Environment Variables

\`\`\`bash
# In your code
const apiKey = process.env.API_KEY;
\`\`\`

### Rotate Keys Regularly

1. Create a new key
2. Update your applications
3. Delete the old key

## Key Format

\`\`\`
chat_<prefix><random>
\`\`\`

Example: \`chat_live_abc123xyz789\`

## Revoking Keys

### Via Dashboard

1. Go to **Settings** > **API Keys**
2. Click **Revoke** on the key

### Via API

\`\`\`bash
curl -X DELETE "https://api.yourdomain.com/v1/api-keys/key_abc123" \\
  -H "Authorization: Bearer your-user-jwt"
\`\`\`

## Rate Limits

| Operation | Limit |
|-----------|-------|
| General requests | 60/min |
| Chat | 60/min |
| Ingestion | 10/min |
`;

export default function APIKeysPage() {
  return <Markdown>{content}</Markdown>;
}
