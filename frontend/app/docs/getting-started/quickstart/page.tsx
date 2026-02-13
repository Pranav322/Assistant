import { Markdown } from "@/components/markdown";

const content = `# Quickstart

Get up and running with the RAG Chatbot Platform in 5 minutes.

## Step 1: Create an Account

1. Visit \`http://localhost:3000/auth/register\`
2. Fill in your email and password

## Step 2: Create a Project

1. After logging in, click **New Project**
2. Enter a project name (e.g., "My Support Bot")
3. Configure allowed origins (where the widget will be embedded)
4. Click **Create Project**

## Step 3: Get API Credentials

1. Navigate to your project settings
2. Copy your **API Key** (starts with \`chat_\`)
3. Note your **Project ID**

## Step 4: Add Documents

### Via Dashboard

1. Go to your project page
2. Click **Add Source**
3. Upload a PDF or enter a URL
4. Wait for processing to complete

### Via API

\`\`\`bash
# Upload a file
curl -X POST "http://localhost:8000/sources/upload" \\
  -H "X-API-Key: your-api-key" \\
  -F "file=@document.pdf"

# Or add a URL
curl -X POST "http://localhost:8000/sources/url" \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/page"}'
\`\`\`

## Step 5: Get a Widget Token

\`\`\`bash
curl -X POST "http://localhost:8000/tokens/widget" \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "your-project-id",
    "origin": "https://example.com"
  }'
\`\`\`

Response:
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400
}
\`\`\`

## Step 6: Embed the Widget

\`\`\`html
<script src="https://widget.yourdomain.com/embed.js" defer></script>

<div id="chatbot-container"></div>

<script>
  window.ChatbotWidget.init({
    container: '#chatbot-container',
    token: 'your-widget-token',
    projectId: 'your-project-id'
  });
</script>
\`\`\`

## Step 7: Chat!

The widget is now live. Type a question related to your documents and get AI-powered answers with citations.

## What's Next?

- [Widget Embedding Guide](/docs/guides/widget-embedding) - More embedding options
- [API Keys Guide](/docs/guides/api-keys) - Manage API keys
`;

export default function QuickstartPage() {
  return <Markdown>{content}</Markdown>;
}
