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

## Phase 5 - Homepage Post-Hero Redesign
- [x] Install `framer-motion` in `frontend/` for scroll/hover animations.
- [x] Create reusable animation components (`AnimatedSection`, `StaggerContainer`, `StaggerItem`, `AnimatedCounter`, `GradientCard`, `MarqueeStrip`).
- [x] Build animated trust/tech stack strip (FastAPI, PostgreSQL/pgvector, Redis, Dramatiq, Azure OpenAI, Docker, Prometheus, Next.js).
- [x] Redesign Features section as a Bento grid with hover lift, gradient borders, and codebase-specific content.
- [x] Build "How it works" 4-step pipeline with scroll-drawn timeline.
- [x] Build "Integrate in seconds" code section with copyable `embed.js` snippet and animated reveal.
- [x] Build "Security & trust" section highlighting bcrypt, JWT origin validation, tenant isolation, no-wildcard postMessage.
- [x] Build animated stats strip (availability, latency, token TTL, auto-refresh).
- [x] Redesign Pricing section with elevated header and existing `PricingTiers`.
- [x] Build FAQ accordion using existing shadcn Accordion.
- [x] Redesign final CTA with radial gradient background and dual buttons.
- [x] Redesign footer to multi-column layout and fix logo typo.
- [x] Ensure all animations respect `prefers-reduced-motion`.
- [x] Run `pnpm lint` and `pnpm build` in `frontend/`.
- [x] Update `AGENTS.md` tech stack (Next.js version, framer-motion, Tailwind, shadcn/ui).
