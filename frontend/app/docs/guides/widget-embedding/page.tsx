import { Markdown } from "@/components/markdown";

const content = `# Widget Embedding

Complete guide to embedding the chat widget on your website.

## Quick Embed

\`\`\`html
<script src="https://widget.yourdomain.com/embed.js" defer></script>

<div id="chatbot"></div>

<script>
  window.ChatbotWidget.init({
    container: '#chatbot',
    token: 'your-widget-token',
    projectId: 'your-project-id'
  });
</script>
\`\`\`

## Widget URL Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| \`token\` | Yes | JWT widget token |
| \`origin\` | Yes | Parent page origin for security |
| \`project_id\` | No | Project ID (can be in token) |

## Token Generation

### Server-Side (Recommended)

\`\`\`bash
curl -X POST "https://api.yourdomain.com/v1/tokens/widget" \\
  -H "X-API-Key: your-project-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "your-project-id",
    "origin": "https://yourwebsite.com"
  }'
\`\`\`

Response:
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400
}
\`\`\`

## Configuration Options

\`\`\`javascript
window.ChatbotWidget.init({
  container: '#chatbot',
  token: 'your-token',
  projectId: 'your-project-id',
  
  // Optional settings
  theme: 'auto',        // 'light', 'dark', 'auto'
  position: 'bottom-right',
  greeting: 'Hi! How can I help?',
});
\`\`\`

## Widget Events

\`\`\`javascript
window.addEventListener('message', (event) => {
  // Widget loaded
  if (event.data.type === 'chatbot:ready') {
    console.log('Widget ready');
  }
  
  // Token expired
  if (event.data.type === 'chatbot:token_expired') {
    console.log('Token expired, refresh needed');
  }
});
\`\`\`

## Security

### Origin Validation

Configure allowed origins in project settings:

\`\`\`
https://example.com
https://www.example.com
http://localhost:3000
\`\`\`

### CSP Headers

\`\`\`
frame-src https://widget.yourdomain.com;
script-src https://widget.yourdomain.com;
\`\`\`

## Troubleshooting

### Widget Not Loading

1. Check browser console for errors
2. Verify token is valid (not expired)
3. Check origin is in allowed origins

### CORS Errors

Ensure your API allows your widget origin:
\`\`\`bash
CORS_ORIGINS="https://widget.yourdomain.com,https://yourwebsite.com"
\`\`\`
`;

export default function WidgetEmbeddingPage() {
  return <Markdown>{content}</Markdown>;
}
