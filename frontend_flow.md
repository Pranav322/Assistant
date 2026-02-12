# Frontend Integration Flow

This file is the single reference for frontend work. Use it instead of scanning backend files.

## Base URLs
- API base: `http://localhost:8001/api/v1` (dev, docker-compose)
- Health: `http://localhost:8001/health`
- Metrics: `http://localhost:8001/metrics`

## Authentication Modes

### 1) API Key (server-to-server or trusted clients)
Use `X-API-Key` for ingestion and chat outside the widget.

Headers:
- `X-API-Key: <api_key>`

### 2) Widget JWT (iframe only)
Widget iframe calls the API using JWT tokens from `/tokens/widget`.

Headers:
- `Authorization: Bearer <widget_token>`
- `Origin: https://customer-domain.com`

### 3) User JWT (frontend dashboard)
User auth for project setup and API key management.

Endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Headers:
- `Authorization: Bearer <user_token>`

## Core Endpoints

### Ingestion (API Key or User JWT)
- `POST /ingestion/upload?project_id=<uuid>`
  - multipart form-data `file`
  - returns `source_id`
- `GET /ingestion/<source_id>?project_id=<uuid>`
  - returns status + metadata
- `POST /ingestion/url?project_id=<uuid>`
  - JSON `{ "url": "https://..." }`

**Dashboard usage:** Use `Authorization: Bearer <user_token>` so the browser never needs an API key.

### Chat (API Key or Widget JWT)
- `POST /projects/<project_id>/chat`
  - JSON `{ "query": "...", "conversation_id": "optional" }`
  - returns `{ response, citations, conversation_id }`

### Widget Token (API Key or User JWT)
- `POST /tokens/widget`
  - API key required
  - JSON `{ "origin": "https://customer.com", "project_id": "uuid" }`
  - returns `{ token, expires_in }`
- `POST /tokens/widget/user`
  - User JWT required
  - JSON `{ "origin": "https://customer.com", "project_id": "uuid" }`
  - returns `{ token, expires_in }`

### Widget RUM Metrics (Widget JWT)
- `POST /metrics/widget`
  - JSON `{ "metrics": [{ "name": "widget_load_time", "value": 420, "tags": { ... } }] }`
  - responds 202

### Widget Token Refresh (Widget JWT)
- `POST /tokens/refresh`
  - Headers: `Authorization: Bearer <widget_token>`, `Origin: https://customer.com`
  - returns `{ token, expires_in }`

### Projects (User JWT or Admin Key)
- `GET /projects`
- `POST /projects`
  - For user JWT: `{ "name": "My Project" }`
  - For admin key: `{ "owner_id": "uuid", "name": "My Project" }`
- `GET /projects/<project_id>`

### API Keys (User JWT or Admin Key)
- `POST /projects/<project_id>/api-keys`
- `GET /projects/<project_id>/api-keys`
- `POST /projects/<project_id>/api-keys/<api_key_id>/revoke`

### Usage (User JWT or API Key)
- `GET /usage?project_id=<uuid>`

## Frontend Flow (Widget)

1) Parent page (customer site) requests a widget token from backend using API key.
2) Parent loads iframe with `token` and `origin` query params.
3) Iframe validates parent origin before processing messages.
4) Iframe calls API `/projects/<project_id>/chat` with `Authorization: Bearer <token>`.
5) Iframe emits `chatbot:ready`, `chatbot:resize`, and `chatbot:token_expired` to parent.
6) Parent requests `/tokens/refresh` and sends `chatbot:set_token` to iframe.

## Widget Protocol Requirements
- Use `postMessage` with strict origin checks.
- Parent page must never call the API directly; only the iframe does.
- Use message types:
  - `chatbot:ready`
  - `chatbot:resize`
  - `chatbot:token_expired`
  - `chatbot:init`
  - `chatbot:toggle`
  - `chatbot:set_token`

## E2E Testing (Playwright)
- When the Next.js/widget project starts, add Playwright tests for:
  - Parent + iframe handshake
  - Token refresh flow
  - Chat request and response rendering
  - Resize/toggle behavior

## Notes
- Production origins must be provided before enforcing CSP/origin rules.
- Do not expose API keys in the browser. Use widget JWTs for all client-side calls.
- Admin bootstrap is available via `X-Admin-Key` for internal setup only.
