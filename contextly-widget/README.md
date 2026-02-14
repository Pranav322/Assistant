# contextly

A lightweight, flexible React library for adding RAG-powered chat to your application.

## Features
- 🪝 **Headless Hook**: `useChat` provides all logic, state, and API handling.
- 🎨 **Drop-in UI**: `Chat` component comes with styles included (zero config).
- 🚀 **Streaming Support**: Built-in support for streaming responses.

## Installation

```bash
npm install contextly
# or
pnpm add contextly
```

## Usage

### 1. Simple Drop-in Widget
Use the pre-built `Chat` component. No extra CSS import needed!

```tsx
import { Chat } from "contextly";

export default function App() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Chat 
        projectId="YOUR_PROJECT_ID"
        token="YOUR_WIDGET_TOKEN"
        apiBaseUrl="https://api.contextly.ai/api/v1"
        title="Support Bot"
      />
    </div>
  );
}
```

### 2. Custom UI (Headless Mode)
For complete control over the UI, use the `useChat` hook. This gives you the message state and send function, but leaves the rendering entirely to you.

```tsx
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
      <button onClick={() => sendMessage()}>Send</button>
    </div>
  );
}
```

## API Reference

### useChat Options
| Option | Type | Description |
|---|---|---|
| `projectId` | `string` | **Required**. The UUID of your project. |
| `token` | `string` | **Required**. The widget JWT token. |
| `apiBaseUrl` | `string` | Base URL for the API (default: production). |
| `onReady` | `() => void` | Callback when chat is initialized. |
| `onError` | `(err: Error) => void` | Callback when an error occurs. |

### Chat Component Props
| Prop | Type | Description |
|---|---|---|
| `className` | `string` | CSS class for the container. |
| `title` | `string` | Title in the header. |
| `onClose` | `() => void` | Callback for close button. |
