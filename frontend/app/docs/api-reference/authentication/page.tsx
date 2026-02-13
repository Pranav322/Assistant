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

## POST /auth/refresh

Refresh an access token.

**Headers:** \`Authorization: Bearer <jwt>\`
`;

export default function AuthEndpointsPage() {
  return <Markdown>{content}</Markdown>;
}
