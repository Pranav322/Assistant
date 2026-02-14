import { Markdown } from "@/components/markdown";

const content = `# Authentication Endpoints

## POST /auth/register

Register a new user.

\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
\`\`\`

Response (201):
\`\`\`json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe"
}
\`\`\`

## POST /auth/login

Login and get access token.

\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword"
}
\`\`\`

Response (200):
\`\`\`json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
\`\`\`

## POST /auth/logout

Logout and invalidate token.

**Headers:** \`Authorization: Bearer <jwt>\`

## Programmatic Access (API Keys)

For server-side integrations or automation scripts, you can use **API Keys**. Unlike the short-lived JWT tokens used in the dashboard, API Keys are permanent (until revoked) and identified by an \`x-api-key\` header.

**Headers:** \`x-api-key: chat_...\`

### Example Usage
\`\`\`bash
curl -X POST https://api.yoursite.com/projects/{id}/ingestion/url \
  -H "x-api-key: chat_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.example.com"}'
\`\`\`
`;

export default function AuthEndpointsPage() {
  return <Markdown>{content}</Markdown>;
}
