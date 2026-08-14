# Remotion Video V2 — Memory

## Purpose
Hero demo video for the Contextly landing page. Shows the product's core flow: scattered documents → ingestion pipeline → embed → chat with sources → CTA.

## Structure
5 scenes (612 frames, ~20.4s @ 30fps):
1. **HeroProblem** (110f) — PDF/link icons orbit chaotically, resolve to Contextly logo, stagger-reveal taglines
2. **IngestionPipeline** (150f) — Source icons → funnel animation → chunk particles → glowing DB → checkmark. Status feed at bottom.
3. **EmbedCode** (100f) — Browser frame with perspective tilt, code panel slides up, typewriter snippet
4. **ChatConversation** (180f) — Browser with generic site, chat widget card slides in, user query → retrieval status with animated PDF icons → dots → answer → source pills
5. **OutroCTA** (120f) — Logo scale spring, tagline stagger reveal, URL fade, particle background

## Design system
- Colors: shadcn zinc scale (matches live landing page) + subtle accent `#4f46e5` (indigo-600, matches widget default)
- Font: Inter (400-700, latin subset)
- Motion: `cubic-bezier(0.16, 1, 0.3, 1)` throughout, springs with overshoot for key moments
- Backgrounds: AnimatedBackground (drifting dot grid SVG) + ParticleField (floating translucent circles) + GradientGlow (pulsing radial gradient)

## Key Components
- `AnimatedIcon` — SVG icon wrapper with spring entrance
- `StaggerReveal` — word-by-word text reveal
- `FunnelShape` — SVG funnel with flowing particles (ingestion visualization)
- `ChunkParticles` — burst particles from funnel bottom

## Running
- `npm run dev` — Remotion Studio
- `npm run build` — bundle
- `npm run lint` — eslint + tsc
- Render still: `npx remotion still HeroDemo --frame=N`

## Tech
- Remotion 4.0.509, React 19, Tailwind CSS v4, @remotion/transitions
- Package manager: npm