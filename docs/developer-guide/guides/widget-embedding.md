# Widget Integration

Complete guide to integrating the chat widget into your application.

## Overview

The widget is a drop-in chat interface that can be embedded into any web application or site. It communicates securely with your backend using JWT tokens.

## Quick Embed

### Script Tag (No React)

Add this to your HTML:

```html
<script 
  src="https://widget.yourdomain.com/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  defer
></script>
```

### React Component

```bash
npm install contextly
```

```tsx
import { Chat } from "contextly";

function App() {
  return (
    <Chat 
      projectId="YOUR_PROJECT_ID"
      token="YOUR_WIDGET_TOKEN"
      apiBaseUrl="https://api.yourdomain.com/api/v1"
    />
  );
}
```

### React Headless Hook

For custom UI, use the `useChat` hook:

```tsx
import { useChat } from "contextly";

function CustomChat() {
  const { messages, input, setInput, sendMessage, isLoading, stop } = useChat({
    projectId: "YOUR_PROJECT_ID",
    token: "YOUR_WIDGET_TOKEN",
    apiBaseUrl: "https://api.yourdomain.com/api/v1",
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
      {isLoading && <button onClick={stop}>Stop</button>}
    </div>
  );
}
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
curl -X POST "https://api.yourdomain.com/api/v1/tokens/widget" \
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

### Script Tag Options

```html
<script 
  src="https://widget.yourdomain.com/embed.js"
  data-token="YOUR_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-api-base-url="https://api.yourdomain.com/api/v1"
  data-mode="popup"
  data-position="right"
  data-offset="24px"
  data-width="360px"
  data-height="600px"
  data-open="false"
  data-button-label="Chat"
  data-refresh-url="https://yourbackend.com/refresh-token"
  data-refresh-method="POST"
  defer
></script>
```

| Attribute | Description | Default |
|-----------|-------------|---------|
| `data-token` | Widget JWT token | Required |
| `data-project-id` | Project UUID | Optional |
| `data-origin` | Parent origin for security | Required |
| `data-api-base-url` | Custom API URL | Auto-detected |
| `data-widget-url` | Custom widget URL | Auto-detected |
| `data-mode` | `popup` or `embedded` | `popup` |
| `data-position` | `left` or `right` | `right` |
| `data-offset` | Offset from edge | `24px` |
| `data-width` | Widget width | `360px` |
| `data-height` | Widget height | `600px` |
| `data-open` | Initial open state | `false` |
| `data-button-label` | Button text | `Chat` |
| `data-refresh-url` | Custom token refresh endpoint | Auto |
| `data-refresh-method` | Token refresh method (`GET` or `POST`) | `POST` |
| `data-refresh-credentials` | Include credentials (`include`, `omit`, `same-origin`) | `include` |

### React Component Props

```tsx
<Chat 
  projectId="YOUR_PROJECT_ID"
  token="YOUR_WIDGET_TOKEN"
  apiBaseUrl="https://api.yourdomain.com/api/v1"
  title="Support Chat"
  className="fixed bottom-4 right-4"
  onClose={() => console.log('Closed')}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `projectId` | `string` | Project UUID |
| `token` | `string` | Widget JWT token |
| `apiBaseUrl` | `string` | API base URL |
| `title` | `string` | Chat header title |
| `className` | `string` | CSS class |
| `onClose` | `() => void` | Close button callback |
| `origin` | `string` | Parent origin |

### useChat Options

```tsx
const { messages, input, setInput, sendMessage, isLoading, stop, updateMessage } = useChat({
  projectId: "YOUR_PROJECT_ID",
  token: "YOUR_WIDGET_TOKEN",
  apiBaseUrl: "https://api.yourdomain.com/api/v1",
  onReady: () => console.log("Ready"),
  onError: (err) => console.error(err),
});
```

| Option | Type | Description |
|--------|------|-------------|
| `projectId` | `string` | Project UUID (Required) |
| `token` | `string` | Widget JWT token (Required) |
| `apiBaseUrl` | `string` | API base URL |
| `onReady` | `() => void` | Ready callback |
| `onError` | `(err: Error) => void` | Error callback |

### useChat Return Values

| Return | Type | Description |
|--------|------|-------------|
| `messages` | `Message[]` | Chat history |
| `isLoading` | `boolean` | Loading state |
| `input` | `string` | Input text |
| `setInput` | `(value: string) => void` | Set input |
| `sendMessage` | `(e?: FormEvent) => void` | Send message |
| `stop` | `() => void` | Stop generation |
| `updateMessage` | `(id: string, updates: Partial<Message>) => void` | Update message |

## Widget Events

Listen to widget events:

```javascript
window.addEventListener('message', (event) => {
  // Widget loaded
  if (event.data.type === 'chatbot:ready') {
    console.log('Widget ready', event.data.requestId);
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

### Message Format

All widget messages follow this structure:

```json
{
  "type": "chatbot:message_type",
  "payload": {},
  "requestId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security

### Origin Validation

The widget validates that it's embedded on the correct origin:

1. Token includes the `origin` claim
2. Widget checks `document.referrer`
3. API validates origin on each request
4. All postMessage events validated

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

## State Synchronization

The React widget automatically syncs internal state with props:

```tsx
function ParentComponent() {
  const [token, setToken] = useState("initial-token");
  
  return (
    <Chat 
      token={token}  // Widget updates when this changes
      projectId="..."
    />
  );
}
```

### Conversation ID

The widget maintains a conversation ID for chat sessions. When `projectId` changes, a new conversation ID is automatically generated to prevent data leakage between projects.

## Error Handling

Errors are handled gracefully with user-friendly messages:

- **Session Expiry**: "Session expired. Please refresh the page."
- **API Errors**: "Sorry, I couldn't respond. Please try again."
- **Network Errors**: "Sorry, I encountered an error. Please try again."

```tsx
const { sendMessage } = useChat({
  projectId: "...",
  token: "...",
  onError: (err) => {
    console.error(err);
    // Send to error reporting service
  }
});
```

## Hosted Widget vs Self-Hosted

### Hosted (Recommended)

Use our hosted widget:
```
https://widget.yourdomain.com
```

### Self-Hosted

Deploy the widget yourself:

1. Build the widget:
   ```bash
   cd contextly-widget
   pnpm install
   pnpm build
   ```

2. Serve from your own domain
3. Set `WIDGET_PUBLIC_ORIGIN` env var to your widget URL

## Publishing the Widget

### Building

```bash
cd contextly-widget
pnpm install
pnpm build
```

### Publish to NPM

```bash
npm publish
```

### Use in Your Project

```bash
# Link locally
pnpm link

# Or publish to private registry
npm publish --registry=https://your-registry.com
```

## Troubleshooting

### Widget Not Loading

1. Check browser console for errors
2. Verify token is valid (not expired)
3. Check origin is in allowed origins
4. Ensure `origin` parameter is set correctly

### CORS Errors

Ensure your API allows your widget origin:
```bash
CORS_ORIGINS="https://widget.yourdomain.com,https://yourwebsite.com"
```

### Token Expiry Issues

- Check token expiration time
- Ensure refresh logic is implemented
- Verify `WIDGET_TOKEN_EXPIRE_SECONDS` setting

### Race Condition / Double Submission

The widget now prevents double submissions. If you experience issues, ensure you're using the latest version.

### React Component Not Updating

Make sure you're passing the latest props. The widget syncs state when props change via useEffect.
