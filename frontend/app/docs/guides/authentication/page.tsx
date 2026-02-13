import { Markdown } from "@/components/markdown";

const content = `# Authentication

Understanding the authentication system.

## Overview

The platform uses three types of credentials:

| Credential | Use Case | Lifespan |
|------------|----------|----------|
| User JWT | Dashboard access | Session-based |
| API Key | Server operations | Long-lived |
| Widget Token | Browser chat | Short-lived (24h) |

## User JWT (Dashboard)

### Login

\`\`\`bash
curl -X POST "https://api.yourdomain.com/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "password"}'
\`\`\`

Response:
\`\`\`json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
\`\`\`

### Using the Token

\`\`\`bash
curl "https://api.yourdomain.com/v1/projects" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
\`\`\`

## API Keys

Long-lived secrets for server-side operations. See [API Keys Guide](/docs/guides/api-keys).

## Widget Tokens

Short-lived JWTs for browser-based chat.

### Generation

\`\`\`bash
curl -X POST "https://api.yourdomain.com/v1/tokens/widget" \\
  -H "X-API-Key: chat_project_key" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id": "proj_123", "origin": "https://example.com"}'
\`\`\`

### Validation

The API validates:
1. Token signature
2. Expiration
3. Origin matches request origin

## Security Flow

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Dashboard   │    │    Widget    │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                    │                           │
│         │ JWT                │ Widget Token              │
└─────────┼────────────────────┼───────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                       API                                │
│  Validate JWT → Dashboard Operations                     │
│  Validate API Key → Server Operations                    │
│  Validate Widget Token → Chat                            │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Token Refresh

### Widget Token

The widget auto-refreshes ~5 minutes before expiration. Listen for events:

\`\`\`javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'chatbot:token_expired') {
    // Fetch new token from your backend
  }
});
\`\`\`

## Best Practices

1. **Never expose secrets in frontend code**
2. **Use HTTPS always**
3. **Rotate credentials regularly**
4. **Use short-lived tokens where possible**
`;

export default function AuthenticationGuidePage() {
  return <Markdown>{content}</Markdown>;
}
