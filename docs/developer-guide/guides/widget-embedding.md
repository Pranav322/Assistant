# Widget Integration

Complete guide to integrating the chat widget into your application.

## Overview

The widget is a drop-in chat interface that can be embedded into any web application or site. It communicates securely with your backend using JWT tokens.

## Quick Embed

Add this to your HTML:

```html
<script src="https://widget.yourdomain.com/embed.js" defer></script>

<div id="chatbot"></div>

<script>
  window.ChatbotWidget.init({
    container: '#chatbot',
    token: 'your-widget-token',
    projectId: 'your-project-id'
  });
</script>
```

## Widget URL Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | JWT widget token |
| `origin` | Yes | Parent page origin for security |
| `project_id` | No | Project ID (can be in token) |

## Token Generation

### Server-Side (Recommended)

Generate tokens from your backend:

```bash
curl -X POST "https://api.yourdomain.com/v1/tokens/widget" \
  -H "X-API-Key: your-project-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "origin": "https://yourwebsite.com"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400
}
```

### Token Refresh

Tokens expire after 24 hours (configurable). The widget auto-refreshes:

```javascript
// Widget listens for chatbot:token_expired
window.addEventListener('message', (event) => {
  if (event.data.type === 'chatbot:token_expired') {
    // Fetch new token from your backend
    fetch('/api/refresh-token')
      .then(res => res.json())
      .then(data => {
        window.ChatbotWidget.setToken(data.token);
      });
  }
});
```

## Configuration Options

```javascript
window.ChatbotWidget.init({
  container: '#chatbot',
  token: 'your-token',
  projectId: 'your-project-id',
  
  // Optional settings
  theme: 'auto',        // 'light', 'dark', 'auto'
  position: 'bottom-right',  // 'bottom-right', 'bottom-left'
  greeting: 'Hi! How can I help?',
  refreshUrl: 'https://yourbackend.com/refresh-token',  // Custom refresh endpoint
});
```

## Widget Events

Listen to widget events:

```javascript
window.addEventListener('message', (event) => {
  // Widget loaded
  if (event.data.type === 'chatbot:ready') {
    console.log('Widget ready');
  }
  
  // Widget resized (chat opened/closed)
  if (event.data.type === 'chatbot:resize') {
    console.log('New height:', event.data.payload.height);
  }
  
  // Token expired
  if (event.data.type === 'chatbot:token_expired') {
    console.log('Token expired, refresh needed');
  }
});
```

## Security

### Origin Validation

The widget validates that it's embedded on the correct origin:

1. Token includes the `origin` claim
2. Widget checks `document.referrer`
3. API validates origin on each request

### Allowed Origins

Configure allowed origins in project settings:

```
https://example.com
https://www.example.com
http://localhost:3000
```

### CSP Headers

If you use Content Security Policy, allow:

```
frame-src https://widget.yourdomain.com;
script-src https://widget.yourdomain.com;
```

## Custom Refresh Endpoint

For server-side token refresh:

```javascript
window.ChatbotWidget.init({
  token: 'initial-token',
  refreshUrl: 'https://yourapi.com/refresh-widget-token',
});
```

Your endpoint should:
- Accept POST requests
- Return new token in same format:
  ```json
  {
    "token": "new-jwt-token",
    "expires_in": 86400
  }
  ```

## Hosted Widget vs Self-Hosted

### Hosted (Recommended)

Use our hosted widget:
```
https://widget.yourdomain.com
```

### Self-Hosted

Deploy the widget yourself:

1. Build the frontend widget:
   ```bash
   cd frontend
   pnpm build
   ```

2. Serve from your own domain
3. Set `WIDGET_PUBLIC_ORIGIN` env var to your widget URL

## Troubleshooting

### Widget Not Loading

1. Check browser console for errors
2. Verify token is valid (not expired)
3. Check origin is in allowed origins

### CORS Errors

Ensure your API allows your widget origin:
```bash
CORS_ORIGINS="https://widget.yourdomain.com,https://yourwebsite.com"
```

### Token Expiry Issues

- Check token expiration time
- Ensure refresh logic is implemented
- Verify `WIDGET_TOKEN_EXPIRE_SECONDS` setting
