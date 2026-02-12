# User Flow Guide

This guide explains how authentication, ingestion, widget tokens, and usage tracking work end-to-end.

## 1) Users and Sessions

### User JWT (dashboard)
- Issued when a user logs in or registers.
- Stored in the browser for dashboard access.
- Used for project management and dashboard-only actions.
- Not used by end users.

## 2) Projects

- A project is the container for all data, chat usage, and widget access.
- Each project has `allowed_origins` which control where the widget can be used.
- Origins are normalized to a full URL (https unless localhost).

## 3) Ingestion

There are two valid authentication paths:

### A) Dashboard ingestion (User JWT)
- The dashboard sends `Authorization: Bearer <user_jwt>`.
- Uploads files or submits URLs.
- API creates a Source and queues background processing.

### B) Server ingestion (API key)
- Your backend sends `X-API-Key: chat_...`.
- Same ingestion endpoints and behavior.
- Recommended for production (keeps ingestion server-side).

Processing steps:
1) Validate input and create a `Source` record.
2) Store file in S3/R2 (if configured).
3) Worker parses, chunks, embeds, and stores vectors.
4) Source status becomes `completed`.

## 4) API Keys

- API keys are long-lived secrets for server-side use.
- Used for ingestion and minting widget tokens.
- Never used in the browser.

## 5) Widget Tokens

Widget tokens are short-lived JWTs used by the browser widget.

### A) Server-minted (production)
- Your backend calls `POST /tokens/widget` with API key.
- Returns a widget token scoped to `project_id` and `origin`.

### B) Dashboard-minted (preview)
- Dashboard calls `POST /tokens/widget/user` using user JWT.
- Allows preview without an API key.

Token lifetime:
- Controlled by `WIDGET_TOKEN_EXPIRE_SECONDS` (default: 24 hours).

Widget hosting origin:
- Set `WIDGET_PUBLIC_ORIGIN` (e.g. `https://widget.pranavbuilds.tech`).
- This ensures tokens are valid for the hosted widget iframe origin.

## 6) Widget Chat

- The widget sends `Authorization: Bearer <widget_token>` to `/projects/{id}/chat`.
- API validates:
  - token signature
  - expiry
  - origin match

## 7) Token Refresh

### Automatic refresh (embed.js)
- The widget auto-refreshes using `/tokens/refresh`.
- It reads `exp` from the JWT and refreshes ~5 minutes early.
- If you provide `data-refresh-url`, it will call your own token broker instead.

### Expired token behavior
- API returns 401 on chat.
- Widget emits `chatbot:token_expired`.
- Embed script requests a new token and calls `setToken`.

## 8) Usage Tracking

Usage is tracked per project:
- `projects.usage.requests`
- `projects.usage.tokens_total`
- `projects.usage.tokens_today`

Counts increment on each chat request.
API keys and user IDs are not used for usage aggregation by default.

## 9) Free Tier Limits (User-Level)

- Free users can create up to `MAX_PROJECTS_PER_USER` projects (default: 1).
- Free users have a lifetime token cap (`USER_TOKEN_CAP`). Once reached, chat requests are blocked until upgrade.
- User rate limits are enforced per minute (see `USER_RATE_LIMIT_PER_MINUTE`).

## Summary: Which credential is used where?

- User JWT: dashboard actions (projects, preview, dashboard ingestion).
- API key: server ingestion + server widget token minting.
- Widget token: browser chat only (short-lived).
