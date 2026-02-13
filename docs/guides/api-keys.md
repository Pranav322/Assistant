# API Keys

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

```bash
curl -X POST "https://api.yourdomain.com/v1/api-keys" \
  -H "Authorization: Bearer your-user-jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

Response:
```json
{
  "id": "key_abc123",
  "name": "Production Key",
  "key": "chat_xyz789...",  # Only shown once!
  "created_at": "2026-02-13T10:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

## Using API Keys

Include the key in the `X-API-Key` header:

```bash
curl "https://api.yourdomain.com/v1/sources" \
  -H "X-API-Key: chat_xyz789..."
```

## Key Types

### Project API Keys

Standard keys for project operations:
- Document ingestion
- Widget token minting

```bash
# Mint widget token
curl -X POST "https://api.yourdomain.com/v1/tokens/widget" \
  -H "X-API-Key: chat_project_key" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "proj_123", "origin": "https://example.com"}'
```

### Admin API Keys

System-level operations:
- User management
- Project deletion
- System metrics

```bash
# Set via environment variable
ADMIN_API_KEY="admin_secret_key"
```

## Security Best Practices

### Never Expose API Keys

- **Never** put API keys in client-side code
- **Never** commit keys to git
- **Never** log keys

### Use Environment Variables

```bash
# .env (add to .gitignore)
AZURE_OPENAI_API_KEY="sk-..."
API_KEY="chat_abc123"
```

```javascript
// In your code
const apiKey = process.env.API_KEY;
```

### Rotate Keys Regularly

1. Create a new key
2. Update your applications
3. Delete the old key

### Limit Key Permissions

- Use separate keys for different environments
- Set expiration dates on keys

## Key Format

```
chat_<prefix><random>
```

Example: `chat_live_abc123xyz789`

## Revoking Keys

### Via Dashboard

1. Go to **Settings** > **API Keys**
2. Click **Revoke** on the key

### Via API

```bash
curl -X DELETE "https://api.yourdomain.com/v1/api-keys/key_abc123" \
  -H "Authorization: Bearer your-user-jwt"
```

## Monitoring Usage

Track API key usage:

```bash
# Get usage stats
curl "https://api.yourdomain.com/v1/usage" \
  -H "X-API-Key: chat_your_key"
```

Response:
```json
{
  "requests": 1450,
  "tokens": 125000,
  "period": "2026-02-13"
}
```

## Rate Limits

API keys have rate limits:

| Operation | Limit |
|-----------|-------|
| General requests | 60/min |
| Chat | 60/min |
| Ingestion | 10/min |
| Token refresh | 30/min |

## Troubleshooting

### 401 Unauthorized

- Check key is valid and not expired
- Verify header: `X-API-Key: chat_...`

### 403 Forbidden

- Key may be revoked
- Key may not have required permissions

### Rate Limited (429)

- Wait and retry
- Contact support for higher limits
