# Integrating the Widget

Once your chatbot is trained, you can integrate it into your application or website so your users can interact with it.

## Configuration

Before integrating, ensure you have allowed your application domain:
1.  Go to **Project Settings**.
2.  Find **"Allowed Origins"**.
3.  Add your website's URL (e.g., `https://www.mycompany.com`).
    *   *Note: usage from unauthorized domains will be blocked.*

## Quick Start

### Get Your Credentials

You need three things from your project:
1.  **Project ID**: Found in your Project Dashboard
2.  **Widget Token**: Generated from your backend (see Token Generation below)
3.  **API URL**: `https://api.pranavbuilds.tech/api/v1` (or your custom domain)

### Generate a Token

Generate a widget token from your backend:

```bash
curl -X POST "https://api.pranavbuilds.tech/api/v1/tokens/widget" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
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

## Embed Methods

### 1. Script Tag (Easiest)

Copy the following code snippet and paste it into your website's HTML, preferably before the closing `</body>` tag.

```html
<script 
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  async
></script>
```

### 2. React Component

If you're using React, you can use the component directly:

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
      apiBaseUrl="https://api.pranavbuilds.tech/api/v1"
    />
  );
}
```

## Customization Options

You can customize the widget behavior by adding data attributes to the script tag:

| Attribute | Description | Default |
| :--- | :--- | :--- |
| `data-position` | Where the button appears (`bottom-right`, `bottom-left`) | `bottom-right` |
| `data-offset` | Distance from edge | `24px` |
| `data-width` | Widget width | `360px` |
| `data-height` | Widget height | `600px` |
| `data-open` | Open by default (`true`, `false`) | `false` |
| `data-button-label` | Button text | `Chat` |
| `data-mode` | `popup` or `embedded` | `popup` |
| `data-primary-color` | Hex color code for the chat button | `#c2410c` |
| `data-greeting` | Initial message shown to users | "How can I help you?" |

### Example: Left Side Widget

```html
<script 
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-position="left"
  data-offset="48px"
  data-button-label="Talk to us"
  async
></script>
```

### Example: Embedded Widget

```html
<script 
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-mode="embedded"
  data-height="500px"
  data-width="400px"
  async
></script>
```

## React Props

If using the React component:

| Prop | Type | Description |
|------|------|-------------|
| `projectId` | `string` | Your project UUID |
| `token` | `string` | Widget JWT token |
| `apiBaseUrl` | `string` | API URL (default: production) |
| `title` | `string` | Chat header title |
| `className` | `string` | CSS class for container |
| `onClose` | `() => void` | Callback when close button clicked |
| `origin` | `string` | Parent origin for security |

## Token Refresh

Tokens expire after 24 hours. The widget can automatically refresh them.

### Option 1: Automatic (Default)

The widget will try to refresh the token using your API endpoint.

### Option 2: Custom Refresh URL

```html
<script 
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-refresh-url="https://yourwebsite.com/api/refresh-widget-token"
  data-refresh-method="POST"
  async
></script>
```

Your refresh endpoint should return:
```json
{
  "token": "new-jwt-token",
  "expires_in": 86400
}
```

### Option 3: Manual Handling

Listen for the token expired event:

```javascript
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

## Programmatic Control

The widget exposes a global object for control:

```javascript
// Open the widget
window.ChatbotWidget.open();

// Close the widget
window.ChatbotWidget.close();

// Toggle the widget
window.ChatbotWidget.toggle();

// Update the token
window.ChatbotWidget.setToken('new-token');

// Refresh token manually
window.ChatbotWidget.refreshToken();

// Destroy the widget
window.ChatbotWidget.destroy();
```

## Listening to Events

```javascript
window.addEventListener('message', (event) => {
  // Widget is ready
  if (event.data.type === 'chatbot:ready') {
    console.log('Widget loaded');
  }
  
  // Widget resized
  if (event.data.type === 'chatbot:resize') {
    console.log('Height:', event.data.payload.height);
  }
  
  // Token needs refresh
  if (event.data.type === 'chatbot:token_expired') {
    console.log('Token expired');
  }
});
```

## Troubleshooting

-   **Widget not showing?** Check your browser console (F12) for errors.
-   **401 Errors?** Ensure your domain is listed in "Allowed Origins".
-   **Token expired?** The widget should auto-refresh. If not, check your refresh endpoint.
-   **CORS errors?** Ensure your API allows the widget origin.
-   **Set `WIDGET_PUBLIC_ORIGIN`** (e.g. `https://widget.contextly.live`).

## Security Notes

1.  Always specify the `data-origin` parameter matching your website
2.  Keep your API keys secure (never expose in frontend code)
3.  Add your domains to "Allowed Origins" in project settings
4.  Tokens are tied to specific origins for security
