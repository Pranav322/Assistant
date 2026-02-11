# WIDGET COMMUNICATION PROTOCOL
**Version:** 1.1.0
**Aligned with:** schema.sql v2.2, security.md v3.0
**Last Updated:** 2026-02-12

---

## **🎯 OVERVIEW**

The widget is embedded as an iframe on customer websites. To ensure security and token isolation, **all API communication happens inside the iframe**. The parent page only acts as a UI container and message relay for user interactions (open/close).

### **Security Architecture:**
1. **Parent Page:** Loads iframe with `token`. Does NOT make API calls.
2. **Iframe:** Validates parent origin, holds the JWT, and calls the API.
3. **API:** Validates JWT and ensures the request comes from the widget origin.

---

## **🔧 WIDGET EMBEDDING**

### **Script Tag Method:**
```html
<script src="https://widget.chatbot.com/embed.js" defer></script>
<!-- Resulting iframe src: -->
<!-- https://widget.chatbot.com/widget.html?token=JWT&origin=https://customer.com -->
```

### **Configuration Parameters:**
| Parameter | Description |
|-----------|-------------|
| `token` | JWT token (Required) |
| `origin` | Expected parent origin (Required for validation) |
| `project_id` | Project ID (Optional, redundant if in token) |

---

## **🔐 SECURITY IMPLEMENTATION**

### **1. Origin Validation (Anti-Hijacking)**
The iframe must verify it is embedded on the correct site *before* processing any messages or showing sensitive data.

**Iframe Logic:**
```javascript
const params = new URLSearchParams(window.location.search);
const expectedOrigin = params.get('origin'); // e.g., https://customer.com

// 1. Check Referrer (Soft check)
if (!document.referrer.startsWith(expectedOrigin)) {
  console.warn('Referrer mismatch');
}

// 2. Strict Handshake
window.addEventListener('message', (event) => {
  if (event.origin !== expectedOrigin) {
    return; // Ignore messages from other origins
  }
  
  // Proceed...
});
```

### **2. Token Isolation**
- The `token` is passed to the iframe via URL fragment or query param.
- The parent page **should not** parse or use this token for API calls.
- The API call `POST /projects/{id}/chat` is made **from the iframe context**.

---

## **📨 MESSAGE PROTOCOL**

### **Message Structure:**
```javascript
{
  "type": "chatbot:message_type",
  "payload": {},
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

---

## **📤 WIDGET → PARENT MESSAGES**

### **`chatbot:ready`**
Widget is loaded and ready.

### **`chatbot:resize`**
Request resize (e.g., chat opened).

### **`chatbot:token_expired`**
Requests a new token from parent (who fetches it from backend).

---

## **📥 PARENT → WIDGET MESSAGES**

### **`chatbot:init`**
Parent sends initial configuration.

### **`chatbot:toggle`**
User clicked the toggle button (if custom).

### **`chatbot:set_token`**
Parent provides a (refreshed) token.

---

## **💻 IMPLEMENTATION REFERENCE**

### **Parent Page (Customer):**
```javascript
// Lightweight wrapper - NO API CALLS
class ChatbotWidgetManager {
  constructor(config) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = `https://widget.chatbot.com/?token=${config.token}&origin=${window.location.origin}`;
    document.body.appendChild(this.iframe);
    
    window.addEventListener('message', (e) => {
      if (e.origin !== 'https://widget.chatbot.com') return;
      this.handleMessage(e.data);
    });
  }

  handleMessage(data) {
    if (data.type === 'chatbot:resize') {
      this.resizeIframe(data.payload);
    }
  }
}
```

### **Widget (Iframe):**
```javascript
// Heavy lifting - HANDLES API
class ChatbotWidget {
  constructor() {
    this.token = new URLSearchParams(window.location.search).get('token');
    this.origin = new URLSearchParams(window.location.search).get('origin');
    this.apiBase = 'https://api.chatbot.com/v1';
  }

  async sendMessage(text) {
    // Call API directly
    const res = await fetch(`${this.apiBase}/projects/${this.projectId}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: text })
    });
    
    const data = await res.json();
    this.displayResponse(data);
  }
}
```
