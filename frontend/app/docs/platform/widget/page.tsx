import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Chat Widget",
  description: "Embed and customize the Contextly chat widget in your website or web app.",
  path: "/docs/platform/widget",
});

const content = `# Chat Widget

Embed an AI chatbot on any website — via a script tag or the **contextly** React library.

## Before You Start

Make sure you have:

1. A **Project** with ingested content
2. A **Widget Token** from your project settings
3. Your website domain added to **Allowed Origins** in project settings

---

## Script Tag (Any Website)

### Quick Install

Paste this before \`</body>\` on your website:

\`\`\`html
<script
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  data-api-base-url="https://api.contextly.live/api/v1"
  data-mode="popup"
  defer
></script>
\`\`\`

### Full HTML Example

Copy and paste this complete example to test:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Site with Contextly Chatbot</title>
  
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    
    /* Custom button to open/close the chatbot */
    .chat-trigger-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4f46e5;
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
    }
  </style>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>This is my site with an AI chatbot assistant.</p>
  
  <button class="chat-trigger-btn" onclick="toggleChat()">
    Chat with us
  </button>

  <script
    src="https://widget.contextly.live/embed.js"
    data-token="YOUR_WIDGET_TOKEN"
    data-project-id="YOUR_PROJECT_ID"
    data-origin="https://yourwebsite.com"
    data-api-base-url="https://api.contextly.live/api/v1"
    data-mode="popup"
    defer
  ></script>

  <script>
    function toggleChat() {
      if (window.ChatbotWidget) {
        window.ChatbotWidget.toggle();
      }
    }
  </script>
</body>
</html>
\`\`\`

### Configuration Options

| Attribute | Required | Description |
|-----------|----------|-------------|
| \`data-token\` | Yes | Your widget token from Settings |
| \`data-project-id\` | Yes | Your project ID |
| \`data-origin\` | Yes | Your website domain |
| \`data-api-base-url\` | No | API base URL (auto-detected) |
| \`data-mode\` | No | \`popup\` or \`embedded\` |
| \`data-width\` | No | Custom width (e.g., \`400px\`) |
| \`data-height\` | No | Custom height (e.g., \`600px\`) |

---

## React & Next.js projects

There is no dedicated React SDK — the script-tag embed above is the
canonical integration for React, Next.js, and every other framework. Load
it once (for example in your root layout or a shared script component) and
it works the same way it does on any other page. See the
[Quickstart](/docs/getting-started/quickstart) for a full walkthrough.

---

## Headless Hooks

For full control over UI:

### 1. Install

\`\`\`bash
npm install contextly
\`\`\`

### 2. Usage

\`\`\`tsx
import { useChat } from "contextly";

function CustomUI() {
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    projectId: "YOUR_PROJECT_ID",
    token: "YOUR_WIDGET_TOKEN",
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => sendMessage()} disabled={isLoading}>Send</button>
    </div>
  );
}
\`\`\`
`;

export default function WidgetPage() {
  return <Markdown>{content}</Markdown>;
}
