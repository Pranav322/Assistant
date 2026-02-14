import { Markdown } from "@/components/markdown";

const content = `# Chat Endpoints

## POST /projects/{project_id}/chat

Send a chat message and get a response.

**Headers:** 
- \`Authorization: Bearer <widget_token>\` (for browser/widget)
- \`x-api-key: chat_...\` (for programmatic/server access)

**Request:**
\`\`\`json
{
  "query": "What is your return policy?",
  "conversation_id": "conv_123"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "response": "Our return policy allows returns within 30 days...",
  "conversation_id": "conv_123",
  "citations": [
    {
      "id": 1,
      "source_id": "src_123",
      "title": "FAQ Document",
      "text": "You may return any item within 30 days..."
    }
  ]
}
\`\`\`

## Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`query\` | string | Yes | User message |
| \`conversation_id\` | string | No | Conversation ID for context |
| \`stream\` | boolean | No | Enable streaming |

## Citations

\`\`\`json
{
  "citations": [
    {
      "id": 1,
      "source_id": "src_123",
      "title": "FAQ Document",
      "page": 3,
      "text": "You may return any item..."
    }
  ]
}
\`\`\`

## Error Responses

- **401** - Token Expired
- **403** - Origin Mismatch
- **429** - Rate Limited
`;

export default function ChatEndpointsPage() {
  return <Markdown>{content}</Markdown>;
}
