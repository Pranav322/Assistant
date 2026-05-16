# Implementation Plan

## Phase 1 - Protocol Consistency
- [x] Unify widget messaging envelope across `embed.js`, hosted widget page, and React SDK.
- [x] Keep legacy compatibility for flat messages during migration.
- [x] Standardize `project_id` as canonical key while accepting `projectId`.

## Phase 2 - Data Contract Consistency
- [x] Align chat `citations` data shape across backend and widget clients.
- [x] Ensure both hosted widget and React SDK can render citation objects and legacy strings.
- [x] Add tests that enforce citation contract expectations.

## Phase 3 - Documentation Sync
- [x] Update `.context/widget_protocol.md` with canonical + compatibility rules.
- [x] Update `.context/api_spec.md` token and widget flow details.
- [x] Update `.context/testing.md` with compatibility matrix and validation gates.
- [x] Update `.context/observability.md` with widget protocol metrics and alerts.
- [x] Update `.context/security.md` protocol section.
- [x] Update `AGENTS.md` with protocol and docs sync rules.

## Phase 4 - Validation
- [x] Run backend tests for widget/chat compatibility.
- [x] Run frontend lint/build.
- [x] Run `contextly-widget` build.
