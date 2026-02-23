import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "API Keys",
  description: "Generate, rotate, and secure API keys for Contextly integrations.",
  path: "/docs/platform/api-keys",
});

const content = `# API Keys

API keys let you interact with the platform programmatically — uploading documents, generating widget tokens, and managing your project from code.

## Creating an API Key

### Via Dashboard

1. Open your project
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Copy the key immediately — it's only shown once

### Via API

\`\`\`bash
curl -X POST "https://api.pranavbuilds.tech/api/v1/api-keys" \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Production Key"}'
\`\`\`

---

## Using API Keys

Include the key in the \`X-API-Key\` header:

\`\`\`bash
curl "https://api.pranavbuilds.tech/api/v1/sources" \\
  -H "X-API-Key: chat_xyz789..."
\`\`\`

---

## Key Format

Keys follow this pattern: \`chat_<prefix><random>\`

Example: \`chat_live_abc123xyz789\`

---

## Revoking Keys

### Via Dashboard

1. Go to **Settings → API Keys**
2. Click **Revoke** next to the key

### Via API

\`\`\`bash
curl -X DELETE "https://api.pranavbuilds.tech/api/v1/api-keys/key_abc123" \\
  -H "Authorization: Bearer YOUR_JWT"
\`\`\`

---

## Rate Limits

| Operation | Limit |
|-----------|-------|
| General requests | 60/min |
| Chat messages | 60/min |
| Document ingestion | 10/min |

---

## Security Best Practices

- **Never** put API keys in client-side / frontend code
- **Never** commit keys to version control
- Store keys in environment variables
- Rotate keys periodically: create new → update apps → revoke old
`;

export default function APIKeysPage() {
  return <Markdown>{content}</Markdown>;
}
