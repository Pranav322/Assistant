# Contextly Widget SDK Documentation

The Contextly Widget is a React-based chat library that allows you to embed a RAG-powered chatbot on any website. This guide covers every feature implemented in the code.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Usage Modes](#usage-modes)
   - [Drop-in Widget](#1-drop-in-widget)
   - [Headless Hook](#2-headless-hook-usechat)
   - [Script Embed (No React)](#3-script-embed-no-react)
4. [Configuration Options](#configuration-options)
   - [Chat Component Props](#chat-component-props)
   - [useChat Options](#usechat-options)
   - [useChat Return Values](#usechat-return-values)
5. [API Reference](#api-reference)
   - [Message Type](#message-type)
   - [ChatConfig Interface](#chatconfig-interface)
   - [ChatState Interface](#chatstate-interface)
6. [Advanced Features](#advanced-features)
   - [State Synchronization](#state-synchronization)
   - [Conversation ID Management](#conversation-id-management)
   - [Error Handling](#error-handling)
   - [Token Refresh](#token-refresh)
7. [Security](#security)
8. [Publishing](#publishing)
9. [Examples](#examples)

---

## Installation

### Using NPM
```bash
npm install contextly
```

### Using PNPM
```bash
pnpm add contextly
```

### Peer Dependencies
Make sure you have React 18+ installed:
```bash
npm install react react-dom
```

---

## Quick Start

### 1. Get Your Credentials
- **Project ID**: UUID from your Contextly project dashboard
- **Widget Token**: JWT token from your project settings
- **API URL**: Your API endpoint (e.g., `https://api.pranavbuilds.tech/api/v1`)

### 2. Add the Widget
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

---

## Usage Modes

### 1. Drop-in Widget

The `Chat` component provides a complete, styled chat interface out of the box.

```tsx
import { Chat } from "contextly";

export default function MyPage() {
  return (
    <div>
      <h1>Welcome to my site</h1>
      <Chat 
        projectId="YOUR_PROJECT_ID"
        token="YOUR_WIDGET_TOKEN"
        apiBaseUrl="https://api.pranavbuilds.tech/api/v1"
        title="Customer Support"
        className="fixed bottom-4 right-4"
      />
    </div>
  );
}
```

**Features included:**
- Message history display
- Auto-scroll to latest message
- Typing indicators
- Markdown rendering with code highlighting
- Citations as clickable links
- Stop generation button
- Auto-resize height updates

---

### 2. Headless Hook (useChat)

For complete UI control, use the `useChat` hook. This gives you full access to the chat state and logic without any UI.

```tsx
import { useChat } from "contextly";

export function CustomChat() {
  const { 
    messages, 
    input, 
    setInput, 
    sendMessage, 
    isLoading,
    stop,
    updateMessage
  } = useChat({
    projectId: "YOUR_PROJECT_ID",
    token: "YOUR_WIDGET_TOKEN",
    apiBaseUrl: "https://api.pranavbuilds.tech/api/v1",
    onReady: () => console.log("Chat ready!"),
    onError: (err) => console.error("Error:", err),
  });

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-${msg.role}`}>
            <div className="content">{msg.content}</div>
            {msg.status === "pending" && <span>Thinking...</span>}
            {msg.citations?.map((cite, i) => (
              <a key={i} href={cite} target="_blank">{cite}</a>
            ))}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          Send
        </button>
        {isLoading && <button onClick={stop}>Stop</button>}
      </div>
    </div>
  );
}
```

---

### 3. Script Embed (No React)

For non-React websites, use the `embed.js` script. This works on any HTML page.

```html
<!-- Add the script to your website -->
<script 
  src="https://widget.yourdomain.com/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-api-base-url="https://api.pranavbuilds.tech/api/v1"
  defer
></script>
```

**Configuration Attributes:**

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-token` | Yes | Widget JWT token |
| `data-project-id` | No | Project UUID (can be in token) |
| `data-origin` | Yes* | Your website origin for security |
| `data-api-base-url` | No | API URL (auto-detected if not provided) |
| `data-widget-url` | No | Custom widget URL |
| `data-mode` | No | `popup` (default) or `embedded` |
| `data-position` | No | `right` (default) or `left` |
| `data-offset` | No | Offset from edge (default: `24px`) |
| `data-width` | No | Custom width (e.g., `400px`) |
| `data-height` | No | Custom height (e.g., `600px`) |
| `data-open` | No | `true` or `false` (default: `false`) |
| `data-button-label` | No | Button text (default: `Chat`) |
| `data-refresh-url` | No | Custom token refresh endpoint |
| `data-refresh-method` | No | Token refresh method (`GET` or `POST`) |

---

## Configuration Options

### Chat Component Props

```tsx
interface ChatProps {
  projectId?: string;      // Project UUID
  token?: string;          // Widget JWT token
  apiBaseUrl?: string;     // API endpoint URL
  className?: string;      // CSS class for container
  title?: string;          // Chat header title
  onClose?: () => void;   // Close button callback
  origin?: string;         // Parent origin for security
}
```

### useChat Options

```tsx
interface ChatConfig {
  projectId: string;       // Project UUID (Required)
  token: string;           // Widget JWT token (Required)
  apiBaseUrl?: string;     // API endpoint (default: production)
  onReady?: () => void;    // Called when chat initializes
  onResize?: (height: number) => void; // Called on height changes
  onError?: (error: Error) => void;   // Called on errors
}
```

### useChat Return Values

```tsx
interface ChatState {
  messages: Message[];     // Chat message history
  isLoading: boolean;      // True when waiting for response
  input: string;           // Current input text
  setInput: (value: string) => void; // Update input
  sendMessage: (e?: React.FormEvent) => void; // Send message
  stop: () => void;       // Stop ongoing request
  updateMessage: (id: string, updates: Partial<Message>) => void; // Update a message
}
```

---

## API Reference

### Message Type

```tsx
type Message = {
  id: string;                      // Unique message ID (UUID)
  role: "user" | "assistant";      // Message sender
  content: string;                 // Message text
  citations?: string[];            // Source URLs (for assistant messages)
  status?: "pending" | "complete" | "error" | "stopped"; // Message status
};
```

### ChatConfig Interface

```tsx
interface ChatConfig {
  projectId: string;       // Required: Project UUID
  token: string;           // Required: Widget JWT token
  apiBaseUrl?: string;     // Optional: API base URL
  onReady?: () => void;   // Optional: Ready callback
  onResize?: (height: number) => void; // Optional: Resize callback
  onError?: (error: Error) => void;   // Optional: Error callback
}
```

### ChatState Interface

```tsx
interface ChatState {
  messages: Message[];                    // Array of messages
  isLoading: boolean;                     // Loading state
  input: string;                          // Input text
  setInput: (value: string) => void;      // Set input text
  sendMessage: (e?: React.FormEvent) => void; // Send message
  stop: () => void;                       // Stop generation
  updateMessage: (id: string, updates: Partial<Message>) => void; // Update message
}
```

---

## Advanced Features

### State Synchronization

The widget automatically syncs internal state with props. If parent components update `projectId`, `token`, or `origin`, the widget will reflect these changes.

```tsx
function ParentComponent() {
  const [token, setToken] = useState("initial-token");
  
  return (
    <Chat 
      token={token}  // Will update when this changes
      // ...
    />
  );
}
```

### Conversation ID Management

The widget maintains a conversation ID to track chat sessions. When `projectId` changes (e.g., switching between bots), a new conversation ID is automatically generated to prevent data leakage.

### Error Handling

Errors are handled gracefully with user-friendly messages:

- **Session Expiry**: Displays "Session expired. Please refresh the page." and emits `chatbot:token_expired` event
- **API Errors**: Displays "Sorry, I couldn't respond. Please try again."
- **Network Errors**: Displays "Sorry, I encountered an error. Please try again."

```tsx
const { sendMessage } = useChat({
  projectId: "...",
  token: "...",
  onError: (err) => {
    // Custom error handling
    console.error(err);
    // Send to error reporting service
  }
});
```

### Token Refresh

The widget supports automatic token refresh:

1. **Widget Mode**: The widget sends `chatbot:token_expired` to the parent, which should handle refresh
2. **Script Embed**: Uses `data-refresh-url` or auto-detects from API

```tsx
// Parent page handles token refresh
window.addEventListener('message', (event) => {
  if (event.data.type === 'chatbot:token_expired') {
    // Fetch new token and update widget
    const newToken = await refreshToken();
    window.ChatbotWidget.setToken(newToken);
  }
});
```

---

## Security

### Origin Validation

The widget validates the parent origin to prevent unauthorized embedding:

1. Checks `document.referrer` on load
2. Validates `event.origin` on all postMessage events
3. Sends `chatbot:token_expired` if origin mismatch detected

### Best Practices

- Always specify `origin` parameter
- Use short-lived tokens (configurable via `WIDGET_TOKEN_EXPIRE_SECONDS`)
- Restrict origins in your project settings

---

## Publishing

### Building the Library

```bash
cd contextly-widget
pnpm install
pnpm build
```

### Publishing to NPM

```bash
# Update version in package.json
npm publish
```

### Publishing to Private Registry

```bash
npm publish --registry=https://your-private-registry.com
```

### Using Locally (Link)

```bash
# In contextly-widget directory
pnpm link

# In your project directory
pnpm link contextly
```

---

## Examples

### Example 1: Popup Chat Widget

```tsx
import { Chat } from "contextly";

function App() {
  return (
    <div className="page">
      <h1>My Website</h1>
      
      {/* Fixed position popup widget */}
      <Chat 
        projectId="abc-123"
        token="eyJhbGciOiJIUzI1..."
        apiBaseUrl="https://api.pranavbuilds.tech/api/v1"
        title="Customer Support"
        className="fixed bottom-4 right-4 z-50"
      />
    </div>
  );
}
```

### Example 2: Embedded Chat Widget

```tsx
import { Chat } from "contextly";

function SupportPage() {
  return (
    <div className="support-page">
      <h1>How can we help?</h1>
      
      {/* Full embedded widget */}
      <div style={{ height: "600px", maxWidth: "500px" }}>
        <Chat 
          projectId="abc-123"
          token="eyJhbGciOiJIUzI1..."
          apiBaseUrl="https://api.pranavbuilds.tech/api/v1"
        />
      </div>
    </div>
  );
}
```

### Example 3: Custom UI with Streaming

```tsx
import { useChat } from "contextly";

function StreamingChat() {
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    projectId: "abc-123",
    token: "eyJhbGciOiJIUzI1...",
    apiBaseUrl: "https://api.pranavbuilds.tech/api/v1",
  });

  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role}>
            <p>{msg.content}</p>
            {msg.citations?.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener">
                Source {i + 1}
              </a>
            ))}
            {msg.status === "pending" && <div className="typing">...</div>}
          </div>
        ))}
      </div>
      
      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
```

### Example 4: Custom Token Refresh URL

```html
<script 
  src="https://widget.yourdomain.com/embed.js"
  data-token="YOUR_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-refresh-url="https://yourwebsite.com/api/refresh-token"
  data-refresh-method="POST"
  data-refresh-credentials="include"
  defer
></script>
```

### Example 5: Position and Styling

```html
<!-- Left side widget with custom size -->
<script 
  src="https://widget.yourdomain.com/embed.js"
  data-token="YOUR_TOKEN"
  data-origin="https://yourwebsite.com"
  data-position="left"
  data-offset="48px"
  data-width="350px"
  data-height="500px"
  data-button-label="Chat with us"
  defer
></script>
```

---

## Troubleshooting

### Widget not loading
- Check browser console for errors
- Verify `origin` parameter matches your website
- Ensure token is valid and not expired

### Token expired errors
- Implement token refresh handling (see Token Refresh section)
- Check `WIDGET_TOKEN_EXPIRE_SECONDS` in your backend config

### CORS errors
- Add your domain to allowed origins in project settings
- Check backend CORS configuration

### Build errors
- Ensure Node.js 18+ is installed
- Run `pnpm install` before building
- Check for TypeScript errors: `pnpm tsc --noEmit`

---

## Support

For issues and feature requests, please open an issue on GitHub.
