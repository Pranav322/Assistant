# Frontend Implementation Plan

This plan covers the Next.js dashboard + embeddable widget. Follow `frontend_flow.md` for API usage.

Status keys:
- [ ] Not started
- [x] Done

Phase 0 - Project setup
- [ ] Create Next.js app scaffold (TypeScript, App Router)
- [ ] Configure environment variables and API base
- [ ] Add linting/formatting and basic CI

Phase 1 - Auth flows (User JWT)
- [ ] Register page (`/auth/register`)
- [ ] Login page (`/auth/login`)
- [ ] Auth session storage and logout
- [ ] `/auth/me` guard for protected routes

Phase 2 - Project dashboard
- [ ] Projects list (`GET /projects`)
- [ ] Create project (`POST /projects`)
- [ ] Project detail view (`GET /projects/{id}`)
- [ ] Usage panel (`GET /usage?project_id=`)

Phase 3 - API key management
- [ ] Create API key (`POST /projects/{id}/api-keys`)
- [ ] List keys (`GET /projects/{id}/api-keys`)
- [ ] Revoke key (`POST /projects/{id}/api-keys/{key_id}/revoke`)

Phase 4 - Widget setup page
- [ ] Copy-paste embed instructions
- [ ] Token acquisition flow (`POST /tokens/widget`)
- [ ] Origin configuration guidance
- [ ] Show widget status + basic diagnostics

Phase 5 - Embeddable widget UI (iframe app)
- [ ] Minimal chat UI (input, messages, citations)
- [ ] Use widget JWT for `/projects/{id}/chat`
- [ ] Handle token refresh (`/tokens/refresh`)
- [ ] Emit widget protocol events (ready, resize, toggle, set_token)

Phase 6 - Widget loader script
- [ ] Parent page integration (postMessage bridge)
- [ ] Origin validation and secure messaging
- [ ] Token refresh handshake

Phase 7 - RUM metrics
- [ ] Emit widget metrics (`/metrics/widget`)
- [ ] Track load time, render time, errors

Phase 8 - E2E testing
- [ ] Playwright: parent+iframe handshake
- [ ] Playwright: token refresh flow
- [ ] Playwright: chat message flow

Notes
- Follow `frontend_flow.md` for API endpoints and auth headers.
- Do not expose API keys in the browser. Widget uses JWT only.
