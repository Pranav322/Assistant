import { Markdown } from "@/components/markdown";

const content = `# Security

Security architecture and best practices.

## Authentication

### Token Types

| Token | Use | Lifespan |
|-------|-----|----------|
| User JWT | Dashboard | Session |
| API Key | Server ops | Long-lived |
| Widget Token | Chat | 24 hours |

### JWT Security

- **Algorithm**: HS256
- **Expiration**: 24 hours (user), configurable (widget)

### API Key Security

- **Hashing**: bcrypt (never stored plaintext)
- **Format**: \`chat_<prefix><random>\`

## Data Protection

### Tenant Isolation

All queries MUST filter by \`project_id\`:

\`\`\`sql
-- CORRECT
SELECT * FROM chunks WHERE project_id = :project_id;

-- WRONG
SELECT * FROM chunks;
\`\`\`

## API Security

### Rate Limiting

| Limit Type | Default |
|------------|---------|
| Requests/min | 60 |
| Tokens/min | 100000 |

### Input Validation

- All inputs validated with Pydantic
- File uploads scanned
- URLs validated for SSRF

## Widget Security

### Origin Validation

1. Token includes origin claim
2. Widget verifies parent origin
3. API validates on each request

### Token Isolation

- Token passed via URL to iframe
- Parent page never reads token
- Widget makes all API calls

## Best Practices

### For Users

1. **Rotate API keys regularly**
2. **Use HTTPS in production**
3. **Configure allowed origins strictly**
4. **Monitor usage for anomalies**

### For Deployment

1. **Use strong JWT_SECRET** (32+ bytes)
2. **Enable RLS policies**
3. **Configure firewall rules**
4. **Set up monitoring alerts**

## Security Headers

\`\`\`nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
\`\`\`
`;

export default function SecurityPage() {
  return <Markdown>{content}</Markdown>;
}
