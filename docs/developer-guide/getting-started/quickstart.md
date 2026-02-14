# Integrate Contextly in 5 minutes

Get up and running with Contextly and integrate the chatbot into your app in 5 minutes.

## Step 1: Create an Account

1. Visit `http://localhost:3000/auth/register`
2. Fill in your email and password
3. Verify your email (if email verification is enabled)

## Step 2: Create a Project

1. After logging in, click **New Project**
2. Enter a project name (e.g., "My Support Bot")
3. Configure allowed origins (where the widget will be embedded):
   ```
   https://example.com
   http://localhost:3000
   ```
4. Click **Create Project**

## Step 3: Get API Credentials

1. Navigate to your project settings
2. Copy your **API Key** (starts with `chat_`)
3. Note your **Project ID**

## Step 4: Add Documents

You can add documents via the dashboard or API:

### Via Dashboard

1. Go to your project page
2. Click **Add Source**
3. Upload a PDF or enter a URL
4. Wait for processing to complete (status: "completed")

### Via API

```bash
# Upload a file
curl -X POST "http://localhost:8000/sources/upload" \
  -H "X-API-Key: your-api-key" \
  -F "file=@document.pdf"

# Or add a URL
curl -X POST "http://localhost:8000/sources/url" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'
```

## Step 5: Get a Widget Token

Generate a widget token for the chat widget:

```bash
curl -X POST "http://localhost:8000/tokens/widget" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "origin": "https://example.com"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400
}
```

## Step 6: Embed in Your App

Add the widget to your existing website or application:

```html
<script src="https://widget.yourdomain.com/embed.js" defer></script>

<div id="chatbot-container"></div>

<script>
  // Initialize with token from Step 5
  window.ChatbotWidget.init({
    container: '#chatbot-container',
    token: 'your-widget-token',
    projectId: 'your-project-id'
  });
</script>
```

## Step 7: Chat!

The widget is now live. Type a question related to your documents and get AI-powered answers with citations.

## What's Next?

- [Widget Embedding Guide](../guides/widget-embedding.md) - More embedding options
- [API Keys Guide](../guides/api-keys.md) - Manage API keys
- [Authentication Guide](../guides/authentication.md) - Understand the auth flow
