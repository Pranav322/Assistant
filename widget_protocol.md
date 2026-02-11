# WIDGET COMMUNICATION PROTOCOL
**Version:** 1.0.0
**Last Updated:** 2026-02-12

---

## **🎯 OVERVIEW**

The widget is embedded as an iframe on customer websites. All communication between the widget (iframe) and parent page uses the `postMessage` API with strict origin validation and message format enforcement.

### **Embedding Flow:**
1. Customer adds script tag to their site
2. Script creates iframe with JWT token
3. Iframe loads, validates token
4. Handshake establishes secure channel
5. Regular chat communication begins

---

## **🔧 WIDGET EMBEDDING**

### **Script Tag Method (Recommended):**
```html
<!-- Add to customer's HTML -->
<script src="https://widget.chatbot.com/embed.js" defer></script>

<!-- The script will create: -->
<div id="chatbot-widget-container" style="position: fixed; bottom: 20px; right: 20px;">
  <button id="chatbot-toggle">💬</button>
  <iframe 
    id="chatbot-widget-iframe"
    src="https://widget.chatbot.com/widget.html?token=JWT_TOKEN&project_id=PROJECT_ID"
    style="display: none; width: 400px; height: 600px; border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"
    sandbox="allow-scripts allow-same-origin allow-forms"
    allow="clipboard-write"
  ></iframe>
</div>
```

### **Manual Iframe Method:**
```html
<iframe
  src="https://widget.chatbot.com/widget.html?token=JWT_TOKEN&project_id=PROJECT_ID&config={config}"
  style="width: 400px; height: 600px; border: none;"
  sandbox="allow-scripts allow-same-origin allow-forms"
></iframe>
```

### **Configuration Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | JWT token from `/tokens/widget` endpoint |
| `project_id` | Yes | Project ID (UUID) |
| `config` | No | JSON-encoded configuration (client-side only) |
| `theme` | No | `light`, `dark`, or `auto` (default) |
| `language` | No | Language code (default: browser language) |
| `initial_message` | No | Pre-populate chat input |
| `hide_logo` | No | `true`/`false` (default: `false`) |
| `z_index` | No | CSS z-index (default: `999999`) |

### **Example config:**
```javascript
const config = {
  theme: 'dark',
  position: { bottom: 20, right: 20 },
  greeting: 'Hello! How can I help you today?',
  avatar: 'https://customer.com/logo.png',
  colors: {
    primary: '#3b82f6',
    background: '#1f2937',
    text: '#f9fafb'
  },
  behavior: {
    auto_open: false,
    require_name: false,
    collect_feedback: true
  }
};

const encoded = encodeURIComponent(JSON.stringify(config));
const iframeSrc = `https://widget.chatbot.com/widget.html?token=...&config=${encoded}`;
```

---

## **📨 MESSAGE PROTOCOL**

### **Message Structure:**
All messages must follow this format:

```javascript
{
  // REQUIRED FIELDS
  "type": "chatbot:message_type",  // See message types below
  "payload": {},                   // Message-specific data
  "requestId": "uuid-v4",         // Unique ID for request/response pairing
  "timestamp": "ISO-8601",        // When message was created
  
  // OPTIONAL FIELDS
  "version": "1.0.0",             // Protocol version
  "origin": "https://customer.com", // For validation
}
```

### **Message Validation Rules:**
1. **Origin Check:** Must validate `event.origin` against allowed origins
2. **Timestamp:** Must be within ±5 minutes of current time
3. **Format:** Must contain all required fields
4. **Size:** Payload must be < 10KB
5. **Rate Limit:** Client-side guardrail only (server-side rate limiting is enforced per security.md)

---

## **📤 WIDGET → PARENT MESSAGES**

### **`chatbot:ready`**
Widget loaded and ready for communication

**Payload:**
```json
{
  "widgetId": "widget_abc123",
  "dimensions": {
    "width": 400,
    "height": 600
  },
  "config": {
    "theme": "dark",
    "version": "1.0.0"
  }
}
```

### **`chatbot:message`**
User sends a message through the widget

**Payload:**
```json
{
  "text": "How do I reset my password?",
  "sessionId": "session_abc123",
  "metadata": {
    "input_method": "keyboard",
    "timestamp": "2026-02-12T10:30:00Z"
  }
}
```

### **`chatbot:token_expiring`**
JWT token is about to expire (1 hour remaining)

**Payload:**
```json
{
  "expiresIn": 1800,
  "currentToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

Parent should: Call `/tokens/refresh` endpoint and send new token via `chatbot:token_refreshed`

### **`chatbot:error`**
Widget encountered an error

**Payload:**
```json
{
  "code": "network_error",
  "message": "Failed to connect to API",
  "details": {},
  "recoverable": true
}
```

**Error Codes:**
- `network_error` — Failed to connect to backend
- `auth_error` — Token expired or invalid
- `config_error` — Invalid configuration
- `render_error` — UI rendering failed
- `message_error` — Message validation failed

### **`chatbot:resize`**
Request parent to resize iframe

**Payload:**
```json
{
  "width": 400,
  "height": 500,
  "reason": "message_history_grew"
}
```

### **`chatbot:close`**
User closed the widget

**Payload:**
```json
{
  "sessionId": "session_abc123",
  "messageCount": 5,
  "duration": 120
}
```

### **`chatbot:feedback`**
User provided feedback (thumbs up/down)

**Payload:**
```json
{
  "messageId": "msg_abc123",
  "feedback": "positive",
  "comment": "Very helpful!",
  "rating": 5
}
```

### **`chatbot:typing`**
User is typing (for typing indicators)

**Payload:**
```json
{
  "isTyping": true,
  "sessionId": "session_abc123"
}
```

---

## **📥 PARENT → WIDGET MESSAGES**

### **`chatbot:ack`**
Acknowledge receipt of message

**Payload:**
```json
{
  "received": true,
  "requestId": "uuid-of-original-message",
  "processedAt": "2026-02-12T10:30:01Z"
}
```

### **`chatbot:response`**
Send chat response from backend

**Payload:**
```json
{
  "text": "To reset your password, go to Settings > Security...",
  "messageId": "msg_abc123",
  "conversationId": "conv_abc123",
  "citations": [
    {
      "id": 1,
      "title": "User Manual",
      "text": "Password reset can be done through the security settings page."
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "responseTime": 1245
  }
}
```

### **`chatbot:token_refreshed`**
Provide new JWT token

**Payload:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 86400,
  "expiresAt": "2026-02-13T10:30:00Z"
}
```

### **`chatbot:config_update`**
Update widget configuration

**Payload:**
```json
{
  "theme": "light",
  "greeting": "New greeting message",
  "colors": {
    "primary": "#10b981"
  }
}
```

### **`chatbot:ping`**
Keepalive/health check

**Payload:**
```json
{
  "timestamp": "2026-02-12T10:30:00Z"
}
```

Widget should respond with: `chatbot:pong`

### **`chatbot:clear`**
Clear chat history

**Payload:**
```json
{
  "sessionId": "session_abc123",
  "reason": "user_requested"
}
```

### **`chatbot:focus`**
Focus the widget input

**Payload:**
```json
{
  "sessionId": "session_abc123"
}
```

---

## **🔐 SECURITY IMPLEMENTATION**

### **Parent Page Code (Customer Website):**
```javascript
class ChatbotWidgetManager {
  constructor(allowedOrigin = 'https://widget.chatbot.com') {
    this.allowedOrigin = allowedOrigin;
    this.widgetIframe = null;
    this.pendingRequests = new Map();
    this.messageHandlers = new Map();
    
    // Set up message listener
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Register default handlers
    this.registerDefaultHandlers();
  }
  
  registerDefaultHandlers() {
    // Handle widget ready
    this.on('chatbot:ready', (payload, requestId) => {
      console.log('Widget ready:', payload);
      this.sendAck(requestId);
    });
    
    // Handle user messages
    this.on('chatbot:message', async (payload, requestId) => {
      this.sendAck(requestId);
      
      // Forward to backend API
      const response = await this.sendToBackend(payload);
      
      // Send response to widget
      this.sendToWidget({
        type: 'chatbot:response',
        payload: response,
        requestId: this.generateRequestId()
      });
    });
    
    // Handle token refresh
    this.on('chatbot:token_expiring', async (payload, requestId) => {
      this.sendAck(requestId);
      
      const newToken = await this.refreshToken(payload.currentToken);
      
      this.sendToWidget({
        type: 'chatbot:token_refreshed',
        payload: { token: newToken },
        requestId: this.generateRequestId()
      });
    });
  }
  
  handleMessage(event) {
    // SECURITY: Validate origin
    if (event.origin !== this.allowedOrigin) {
      console.warn('Blocked message from unauthorized origin:', event.origin);
      return;
    }
    
    const message = event.data;
    
    // Validate message structure
    if (!this.validateMessage(message)) {
      console.warn('Invalid message format:', message);
      return;
    }
    
    // Check for replay attacks (timestamp within 5 minutes)
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - messageTime) > 5 * 60 * 1000) {
      console.warn('Message timestamp outside valid window:', message.timestamp);
      return;
    }
    
    // Handle the message
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.payload, message.requestId, event.origin);
    } else {
      console.warn('No handler for message type:', message.type);
    }
  }
  
  validateMessage(message) {
    const required = ['type', 'payload', 'requestId', 'timestamp'];
    return required.every(field => field in message);
  }
  
  sendToWidget(message) {
    if (!this.widgetIframe) {
      console.error('No widget iframe available');
      return;
    }
    
    // Add required fields if missing
    if (!message.requestId) {
      message.requestId = this.generateRequestId();
    }
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    if (!message.version) {
      message.version = '1.0.0';
    }
    
    this.widgetIframe.contentWindow.postMessage(message, this.allowedOrigin);
  }
  
  sendAck(requestId) {
    this.sendToWidget({
      type: 'chatbot:ack',
      payload: { received: true },
      requestId: this.generateRequestId(),
      inResponseTo: requestId
    });
  }
  
  generateRequestId() {
    return 'req_' + crypto.randomUUID();
  }
  
  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }
  
  // Backend communication
  async sendToBackend(messagePayload) {
    const response = await fetch('https://api.chatbot.com/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.currentToken}`
      },
      body: JSON.stringify({
        query: messagePayload.text,
        conversation_id: messagePayload.sessionId
      })
    });
    
    return response.json();
  }
  
  async refreshToken(oldToken) {
    const response = await fetch('https://api.chatbot.com/v1/tokens/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: oldToken,
        origin: window.location.origin
      })
    });
    
    const data = await response.json();
    this.currentToken = data.token;
    return data.token;
  }
}
```

### **Widget Code (Inside Iframe):**
```javascript
class ChatbotWidget {
  constructor() {
    this.parentOrigin = null;
    this.sessionId = this.generateSessionId();
    this.pendingRequests = new Map();
    this.messageHandlers = new Map();
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // Get configuration from URL
    this.config = this.parseUrlConfig();
    
    // Set up message listener
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Register default handlers
    this.registerDefaultHandlers();
    
    // Send ready message
    this.sendReady();
  }
  
  parseUrlConfig() {
    const urlParams = new URLSearchParams(window.location.search);
    const config = {
      token: urlParams.get('token'),
      project: urlParams.get('project'),
      theme: urlParams.get('theme') || 'auto'
    };
    
    // Parse JSON config if present
    const configParam = urlParams.get('config');
    if (configParam) {
      try {
        Object.assign(config, JSON.parse(decodeURIComponent(configParam)));
      } catch (e) {
        console.error('Failed to parse config:', e);
      }
    }
    
    return config;
  }
  
  handleMessage(event) {
    // SECURITY: Only accept messages from parent window
    if (event.source !== window.parent) {
      console.warn('Blocked message from non-parent:', event.source);
      return;
    }
    
    // Set parent origin on first valid message
    if (!this.parentOrigin) {
      this.parentOrigin = event.origin;
    }
    
    // Validate origin matches parent
    if (event.origin !== this.parentOrigin) {
      console.warn('Origin changed, expected:', this.parentOrigin, 'got:', event.origin);
      return;
    }
    
    const message = event.data;
    
    // Validate message
    if (!this.validateMessage(message)) {
      console.warn('Invalid message format:', message);
      return;
    }
    
    // Handle based on type
    if (message.type === 'chatbot:ack') {
      // Handle acknowledgement
      const resolver = this.pendingRequests.get(message.inResponseTo);
      if (resolver) {
        resolver(message.payload);
        this.pendingRequests.delete(message.inResponseTo);
      }
    } else {
      // Handle other messages
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.payload, message.requestId);
      }
    }
  }
  
  validateMessage(message) {
    const required = ['type', 'payload', 'requestId', 'timestamp'];
    if (!required.every(field => field in message)) {
      return false;
    }
    
    // Check timestamp (within 5 minutes)
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - messageTime) > 5 * 60 * 1000) {
      return false;
    }
    
    return true;
  }
  
  sendToParent(message) {
    if (!window.parent || !this.parentOrigin) {
      // Queue message until parent is ready
      this.messageQueue.push(message);
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
      return;
    }
    
    // Ensure required fields
    if (!message.requestId) {
      message.requestId = this.generateRequestId();
    }
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    if (!message.version) {
      message.version = '1.0.0';
    }
    
    // Send via postMessage
    window.parent.postMessage(message, this.parentOrigin);
    
    // Return promise for response
    return new Promise((resolve) => {
      this.pendingRequests.set(message.requestId, resolve);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(message.requestId)) {
          this.pendingRequests.delete(message.requestId);
          resolve({ error: 'timeout' });
        }
      }, 30000);
    });
  }
  
  async processQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.messageQueue.length > 0 && this.parentOrigin) {
      const message = this.messageQueue.shift();
      await this.sendToParent(message);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isProcessingQueue = false;
  }
  
  sendReady() {
    this.sendToParent({
      type: 'chatbot:ready',
      payload: {
        widgetId: this.generateWidgetId(),
        dimensions: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        config: this.config,
        sessionId: this.sessionId
      }
    });
  }
  
  sendMessage(text) {
    return this.sendToParent({
      type: 'chatbot:message',
      payload: {
        text: text,
        sessionId: this.sessionId,
        metadata: {
          input_method: 'keyboard',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
  
  sendError(code, message, recoverable = true) {
    this.sendToParent({
      type: 'chatbot:error',
      payload: {
        code: code,
        message: message,
        recoverable: recoverable,
        sessionId: this.sessionId
      }
    });
  }
  
  registerDefaultHandlers() {
    // Handle ping
    this.on('chatbot:ping', (payload, requestId) => {
      this.sendToParent({
        type: 'chatbot:pong',
        payload: { timestamp: new Date().toISOString() },
        requestId: this.generateRequestId(),
        inResponseTo: requestId
      });
    });
    
    // Handle config updates
    this.on('chatbot:config_update', (payload, requestId) => {
      Object.assign(this.config, payload);
      this.applyConfig();
      
      this.sendToParent({
        type: 'chatbot:ack',
        payload: { applied: true },
        requestId: this.generateRequestId(),
        inResponseTo: requestId
      });
    });
    
    // Handle chat responses
    this.on('chatbot:response', (payload, requestId) => {
      // Display response in UI
      this.displayMessage(payload.text, 'assistant', payload.messageId);
      
      // Show citations if available
      if (payload.citations && payload.citations.length > 0) {
        this.displayCitations(payload.citations);
      }
    });
  }
  
  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }
  
  generateRequestId() {
    return 'req_' + crypto.randomUUID();
  }
  
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  generateWidgetId() {
    return 'widget_' + Math.random().toString(36).substring(2);
  }
  
  // UI methods (simplified)
  displayMessage(text, role, messageId) {
    // Implement UI rendering here
    console.log(`[${role}] ${text}`);
  }
  
  displayCitations(citations) {
    // Show citations in UI
    citations.forEach(citation => {
      console.log(`[${citation.id}] ${citation.title}: ${citation.text}`);
    });
  }
  
  applyConfig() {
    // Apply theme, colors, etc.
    if (this.config.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (this.config.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // ... other config application
  }
}

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.widget = new ChatbotWidget();
});
```

---

## **🚨 ERROR HANDLING**

### **Connection Issues:**
- **Widget can't reach parent:** Queue messages, retry every 5 seconds
- **Parent can't reach widget:** Show error in parent console, attempt re-initialization
- **Token expired:** Auto-refresh with exponential backoff (1s, 2s, 4s, 8s... max 64s)
- **API unreachable:** Show user-friendly message, retry button

### **Recovery Strategies:**
```javascript
class ConnectionManager {
  constructor(widget) {
    this.widget = widget;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.backoffMultiplier = 2;
    this.baseDelay = 1000;
  }
  
  async sendWithRetry(message, maxRetries = this.maxRetries) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await this.widget.sendToParent(message);
        if (response && !response.error) {
          this.retryCount = 0; // Reset on success
          return response;
        }
        
        if (response?.error === 'timeout') {
          throw new Error('Timeout');
        }
      } catch (error) {
        if (i === maxRetries) {
          throw error;
        }
        
        const delay = this.baseDelay * Math.pow(this.backoffMultiplier, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

---

## **📊 ANALYTICS & METRICS**

### **Widget Metrics to Track:**
```javascript
const metrics = {
  performance: {
    loadTime: 0,        // Time to widget ready
    firstMessageTime: 0, // Time to first user message
    messageLatency: []   // Response times for messages
  },
  engagement: {
    messagesSent: 0,
    messagesReceived: 0,
    sessions: 0,
    sessionDuration: 0
  },
  errors: {
    networkErrors: 0,
    authErrors: 0,
    validationErrors: 0
  }
};
```

### **Send Metrics to Parent:**
```javascript
// Periodic metric reporting
setInterval(() => {
  widget.sendToParent({
    type: 'chatbot:metrics',
    payload: metrics,
    requestId: widget.generateRequestId()
  });
}, 60000); // Every minute
```

---

## **🔧 TESTING PROTOCOL**

### **Test Message Sequence:**
1. Parent sends `chatbot:ping`
2. Widget responds with `chatbot:pong`
3. Widget sends `chatbot:ready`
4. Parent responds with `chatbot:ack`
5. Simulate user message flow
6. Test error conditions
7. Test token refresh flow

### **Integration Test Script:**
```javascript
// test-widget-integration.js
async function testWidgetIntegration() {
  console.log('Starting widget integration test...');
  
  // 1. Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = 'https://widget.chatbot.com/widget.html?test=true';
  document.body.appendChild(iframe);
  
  // 2. Set up message listener
  const messages = [];
  window.addEventListener('message', (event) => {
    if (event.origin === 'https://widget.chatbot.com') {
      messages.push(event.data);
      console.log('Received:', event.data.type);
    }
  });
  
  // 3. Wait for ready
  await waitForMessage('chatbot:ready', 5000);
  
  // 4. Send ping
  iframe.contentWindow.postMessage({
    type: 'chatbot:ping',
    payload: {},
    requestId: 'test_ping',
    timestamp: new Date().toISOString()
  }, 'https://widget.chatbot.com');
  
  // 5. Wait for pong
  await waitForMessage('chatbot:pong', 5000);
  
  console.log('✅ All tests passed!');
}

function waitForMessage(type, timeout) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const message = messages.find(m => m.type === type);
      if (message) {
        resolve(message);
      } else {
        setTimeout(check, 100);
      }
    };
    
    setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
    check();
  });
}
```

---

## **📝 VERSIONING & COMPATIBILITY**

### **Protocol Versioning:**
- **Major changes:** Breaking changes to message format
- **Minor changes:** New message types, optional fields
- **Patch changes:** Bug fixes, documentation updates

### **Backward Compatibility:**
- New fields are always optional
- Old message types remain supported for 6 months
- Deprecation warnings in console
- Version negotiation during handshake

### **Version Detection:**
```javascript
// During handshake
widget.sendToParent({
  type: 'chatbot:handshake',
  payload: {
    version: '1.0.0',
    supportedVersions: ['1.0.0', '0.9.0']
  }
});
```
