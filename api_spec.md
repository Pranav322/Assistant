# API SPECIFICATION
**Version:** 1.1.0
**Aligned with:** schema.sql v2.2, security.md v3.0, retrieval.md v1.0
**Last Updated:** 2026-02-12

---

## **📋 OVERVIEW**

All endpoints require authentication. Rate limiting is enforced per key or token.

**Base URL:** `https://api.chatbot.com/v1`
**Versioning:** `Accept-Version: v1` (Optional, defaults to v1)

---

## **🔐 AUTHENTICATION ENDPOINTS**

### **POST /tokens/widget**
Generate JWT token for browser widget.

**Request:** `{"origin": "https://customer.com", "project_id": "uuid"}`
**Response:** `{"token": "JWT", "expires_in": 86400}`

---

## **🏢 PROJECT MANAGEMENT**

### **GET /projects**
List projects.

### **POST /projects**
Create project.

### **GET /projects/{id}**
Get project details.

---

## **💬 CHAT ENDPOINTS**

### **POST /projects/{project_id}/chat**
Send message and get response.

**Request:**
```json
{
  "query": "Hello",
  "conversation_id": "uuid",
  "stream": false
}
```

**Response:**
```json
{
  "response": "Hi there!",
  "citations": []
}
```

---

## **⚙️ SYSTEM & OBSERVABILITY ENDPOINTS**

### **GET /health**
Quick liveness check. Returns `{"status": "ok"}`.

### **GET /health/ready**
Deep readiness check (DB, Redis, S3). Returns `{"status": "ready"}` or 503.

### **GET /admin/projects/{project_id}/metrics/retrieval**
Get retrieval performance metrics for admin dashboard.

**Response:**
```json
{
  "avg_latency_ms": 145,
  "p95_latency_ms": 450,
  "total_queries": 1200
}
```

### **POST /metrics/widget**
Ingest Real User Monitoring (RUM) metrics from widget.

**Request:** `{"metrics": [{"name": "load_time", "value": 300}]}`
**Response:** 202 Accepted.

### **GET /usage**
Returns current API usage stats.

```json
{
  "requests": 145,
  "tokens": 12400
}
```
