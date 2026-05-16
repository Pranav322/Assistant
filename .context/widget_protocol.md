# WIDGET COMMUNICATION PROTOCOL
**Version:** 1.2.0
**Aligned with:** schema.sql v2.2, security.md v3.0, api_spec.md v1.2.0
**Last Updated:** 2026-04-24

---

## Overview

This protocol defines communication between:

1. Parent host page (`embed.js` or custom integrator)
2. Widget iframe (`/widget` page)
3. React SDK (`contextly-widget` package)

Security model stays the same: API calls happen in iframe/SDK context, not in parent host page.

---

## Versioning And Compatibility

- Canonical protocol is `v1.2`.
- Legacy `v1.1` flat messages are still accepted for backward compatibility.
- New emitters must send canonical envelope.
- Receivers must parse both canonical and legacy forms.

Compatibility window:

- **Now:** dual-read, canonical-write.
- **Future:** once telemetry confirms low legacy usage, remove legacy flat parsing in a major release.

---

## Message Envelope (Canonical)

All messages SHOULD follow:

```json
{
  "type": "chatbot:message_type",
  "payload": {},
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

Required fields:

- `type`
- `payload` (use `{}` if empty)

Recommended fields:

- `requestId`
- `timestamp`

Legacy compatibility:

- Receivers must accept top-level fields (for example `token`, `projectId`) when `payload` is absent.

---

## Query Parameters

Canonical query params:

- `token`
- `origin`
- `project_id`
- `mode` (`popup` or `embedded`)

Backward compatibility:

- Receivers may also read `projectId`.
- Emitters should write `project_id` and may duplicate `projectId` during migration.

---

## Parent -> Widget Messages

### `chatbot:init`

Purpose: initialize token/project/origin.

Canonical payload:

```json
{
  "token": "JWT",
  "project_id": "uuid",
  "projectId": "uuid",
  "origin": "https://customer.com"
}
```

Notes:

- `project_id` is canonical.
- `projectId` is included for migration compatibility.

### `chatbot:set_token`

Purpose: update widget auth token.

Canonical payload:

```json
{
  "token": "JWT"
}
```

### `chatbot:open` / `chatbot:close` / `chatbot:toggle`

Purpose: control open state.

Canonical payload: `{}`

---

## Widget -> Parent Messages

### `chatbot:ready`

Purpose: iframe loaded and ready for init.

Payload: `{}`

### `chatbot:resize`

Purpose: request parent container size update.

Canonical payload:

```json
{
  "height": 600,
  "width": 360
}
```

Any field may be omitted if unchanged.

### `chatbot:token_expired`

Purpose: notify parent that token refresh is required.

Payload: `{}`

---

## Security Requirements

1. Validate `event.origin` for every `postMessage` on both sides.
2. Use specific `targetOrigin` in `postMessage`; never `*` in production.
3. Treat message payload as untrusted input and validate expected fields/types.
4. Prefer canonical envelope with `requestId` and `timestamp` for traceability.
5. Parent must never call protected chat APIs directly with widget token.

---

## Implementation Guidance

Receiver parsing pattern:

```javascript
function getPayload(data) {
  if (data && data.payload && typeof data.payload === "object") {
    return data.payload;
  }
  return data || {};
}
```

Emitter pattern:

```javascript
function createMessage(type, payload = {}) {
  return {
    type,
    payload,
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...payload
  };
}
```

The spread of payload at top-level is optional, but useful for temporary legacy interop.

---

## Test Matrix (Required)

1. `embed.js` (canonical write) -> hosted widget (dual read)
2. `embed.js` (canonical write) -> React SDK `Chat` (dual read)
3. Legacy flat message -> hosted widget (dual read)
4. Legacy flat message -> React SDK `Chat` (dual read)
5. Canonical `project_id` query param path
6. Legacy `projectId` query param path

All scenarios must pass before removing legacy parsing.
