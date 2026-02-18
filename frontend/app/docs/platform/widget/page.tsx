import { Markdown } from "@/components/markdown";

const content = `# Chat Widget

Embed an AI chatbot on any website — via a script tag or the **contextly** React library.

## Before You Start

Make sure you have:

1. A **Project** with ingested content
2. An **API Key** for your project
3. Your website domain added to **Allowed Origins** in project settings

## Getting a Widget Token

Generate a token by calling your backend:

\`\`\`bash
curl -X POST "https://api.pranavbuilds.tech/api/v1/tokens/widget" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "YOUR_PROJECT_ID",
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

---

## Embedding

### Script Tag (Any Website)

Paste this before \`</body>\` on your website:

\`\`\`html
<script
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  async
></script>
\`\`\`

---

### React Library (\`contextly\`)

If you're building with React, use the official **contextly** npm package. It gives you two options: a ready-made UI component or a headless hook for full control.

\`\`\`bash
npm install contextly
# or
pnpm add contextly
\`\`\`

#### Drop-in Component

The \`Chat\` component comes with styles included — zero config needed:

\`\`\`tsx
import { Chat } from "contextly";

export default function App() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Chat
        projectId="YOUR_PROJECT_ID"
        token="YOUR_WIDGET_TOKEN"
        apiBaseUrl="https://api.pranavbuilds.tech/api/v1"
        title="Support Bot"
      />
    </div>
  );
}
\`\`\`

| Prop | Type | Description |
|------|------|-------------|
| \`projectId\` | \`string\` | **Required.** Your project UUID |
| \`token\` | \`string\` | **Required.** Widget JWT token |
| \`apiBaseUrl\` | \`string\` | API URL (defaults to production) |
| \`title\` | \`string\` | Title in the chat header |
| \`className\` | \`string\` | CSS class for the container |
| \`onClose\` | \`() => void\` | Callback when close button is clicked |

#### Headless Hook (\`useChat\`)

For complete control over the UI, use the \`useChat\` hook. It handles API calls, streaming, and state — you just render:

\`\`\`tsx
import { useChat } from "contextly";

export function CustomChatWidget() {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading
  } = useChat({
    projectId: "YOUR_PROJECT_ID",
    token: "YOUR_WIDGET_TOKEN",
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={() => sendMessage()} disabled={isLoading}>
        Send
      </button>
    </div>
  );
}
\`\`\`

| Option | Type | Description |
|--------|------|-------------|
| \`projectId\` | \`string\` | **Required.** Your project UUID |
| \`token\` | \`string\` | **Required.** Widget JWT token |
| \`apiBaseUrl\` | \`string\` | API URL (defaults to production) |
| \`onReady\` | \`() => void\` | Called when chat is initialized |
| \`onError\` | \`(err: Error) => void\` | Called when an error occurs |

---

## Script Tag Customization

Control the widget's appearance with data attributes:

| Attribute | Description | Default |
|-----------|-------------|---------|
| \`data-position\` | \`bottom-right\` or \`bottom-left\` | \`bottom-right\` |
| \`data-width\` | Widget width | \`360px\` |
| \`data-height\` | Widget height | \`600px\` |
| \`data-open\` | Open by default | \`false\` |
| \`data-button-label\` | Button text | \`Chat\` |
| \`data-mode\` | \`popup\` or \`embedded\` | \`popup\` |
| \`data-primary-color\` | Button color (hex) | \`#c2410c\` |
| \`data-greeting\` | Initial message | \`How can I help you?\` |
| \`data-trigger-selector\` | CSS selector for custom open buttons | \`null\` |
| \`data-hide-launcher\` | Hide the default floating bubble | \`false\` |

### Example: Custom Trigger Button

If you want to use your own button instead of our floating bubble:

\`\`\`html
<!-- Your custom button -->
<button id="support-btn">Contact Support</button>

<script
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-trigger-selector="#support-btn"
  data-hide-launcher="true"
  async
></script>
\`\`\`

---

### Example: Embedded Mode

\`\`\`html
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
\`\`\`

---

## Programmatic Control

The script-tag widget exposes a global API:

\`\`\`javascript
// Open / close / toggle
window.ChatbotWidget.open();
window.ChatbotWidget.close();
window.ChatbotWidget.toggle();

// Update token
window.ChatbotWidget.setToken('new-token');

// Destroy widget
window.ChatbotWidget.destroy();
\`\`\`

---

## Token Refresh

Tokens expire after 24 hours. The widget tries to auto-refresh by default.

For manual refresh, listen for the expiry event:

\`\`\`javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'chatbot:token_expired') {
    fetch('/api/refresh-token')
      .then(res => res.json())
      .then(data => {
        window.ChatbotWidget.setToken(data.token);
      });
  }
});
\`\`\`

---

## Troubleshooting

- **Widget not showing?** Check the browser console for errors
- **401 Errors?** Your domain may not be in Allowed Origins
- **Token expired?** The widget should auto-refresh. If not, check your refresh endpoint
- **CORS errors?** Make sure the API allows your widget origin
`;

export default function WidgetPage() {
  return <Markdown>{content}</Markdown>;
}
