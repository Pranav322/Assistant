# Security

Security architecture for embedding the chatbot into your application.

## Authentication

### Token Types

| Token | Use | Lifespan | Storage |
|-------|-----|----------|---------|
| User JWT | Dashboard Access | Session | Browser (Cookie) |
| API Key | Backend Integration | Long-lived | Server-Side |
| Widget Token | Embedded Chat | 24 hours | Browser (Iframe) |

### JWT Security

- **Algorithm**: HS256
- **Audience**: Configurable (`USER_JWT_AUDIENCE`)
- **Issuer**: Configurable (`JWT_ISSUER`)
- **Expiration**: 24 hours (user), configurable (widget)

### API Key Security

- **Hashing**: bcrypt (never stored in plaintext)
- **Format**: `chat_<prefix><random>`
- **Rotation**: Supported via dashboard

## Data Protection

### Tenant Isolation

All queries MUST filter by `project_id`:

```sql
-- CORRECT
SELECT * FROM chunks WHERE project_id = :project_id;

-- WRONG (security violation)
SELECT * FROM chunks;  -- No project filter!
```

### Row-Level Security (RLS)

Database-level enforcement:
- Each table has `project_id` column
- RLS policies enforce tenant isolation

## API Security

### Rate Limiting

Per-key/token limits:

| Limit Type | Default |
|------------|---------|
| Requests/min | 60 |
| Tokens/min | 100000 |
| IP-based | 1000/min |

### Input Validation

- All inputs validated with Pydantic
- File uploads scanned for malware
- URLs validated for SSRF

### CORS

Configure allowed origins:

```bash
CORS_ORIGINS="https://example.com,https://app.example.com"
```

## Storage Security

### Encryption at Rest

- Database: PostgreSQL TDE
- S3: SSE-S3 or SSE-KMS

### Encryption in Transit

- TLS 1.2+ required
- Certificate validation enforced

### Secrets Management

- Never commit secrets to git
- Use environment variables
- Rotate secrets regularly

## Widget Security

### Origin Validation

1. Token includes origin claim
2. Widget verifies parent origin
3. API validates on each request

### Token Isolation

- Token passed via URL to iframe
- Parent page never reads token
- Widget makes all API calls

### CSP Headers

Generated from project allowed origins:

```
Content-Security-Policy: 
  frame-ancestors https://example.com;
  script-src https://widget.yourdomain.com;
```

## Security Headers

Recommended Nginx配置:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Monitoring

### Logging

- Structured JSON logging with structlog
- Request IDs for tracing
- No PII in logs

### Metrics

Track security events:

- Failed authentication attempts
- Rate limit violations
- Invalid origins

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

## Compliance

### Data Handling

- User data encrypted at rest
- Deletion on project delete
- No data export without auth

### Audit Trail

- All API requests logged
- Authentication events tracked
- Access logs retained

## Reporting Security Issues

If you find a security vulnerability:

1. Email: security@example.com
2. Do not disclose publicly
3. We will respond within 24 hours
