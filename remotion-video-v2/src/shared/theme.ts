// Design tokens for the video. Every value is a CSS custom property so the
// same scene tree can render light or dark: the Dark composition wraps the
// tree in `.ct-dark` (see index.css) and every colour re-resolves.
//
// Mirrors the shadcn zinc tokens from frontend/app/globals.css, plus the
// non-shadcn colours the demo needs (the fake Acme site, code syntax).
// Numbers stay numbers — only colours are themed.

const v = (name: string) => `var(--ct-${name})`;

export const theme = {
  // Surfaces
  background: v("background"),
  backdrop: v("backdrop"),
  surface: v("surface"),
  surfaceMuted: v("surface-muted"),
  secondary: v("secondary"),
  inputBg: v("input-bg"),
  border: v("border"),
  separator: v("separator"),

  // Text
  foreground: v("foreground"),
  mutedForeground: v("muted-foreground"),
  placeholder: v("placeholder"),

  // Primary (near-black in light, near-white in dark — shadcn inverts it)
  primary: v("primary"),
  primaryForeground: v("primary-foreground"),

  // Accent
  accent: v("accent"),
  accentMuted: v("accent-muted"),
  accentTint: v("accent-tint"),
  accentTintStrong: v("accent-tint-strong"),
  accentBorder: v("accent-border"),
  accentBorderStrong: v("accent-border-strong"),
  accentRing: v("accent-ring"),
  accentGlowSm: v("accent-glow-sm"),
  accentGlowMd: v("accent-glow-md"),
  accentGlowLg: v("accent-glow-lg"),
  accentShadow: v("accent-shadow"),

  // Status
  success: v("success"),
  successIcon: v("success-icon"),
  destructive: v("destructive"),

  // Incidentals
  overlay: v("overlay"),
  iconTile: v("icon-tile"),
  emptyFill: v("empty-fill"),
  emptyCircle: v("empty-circle"),
  lineNumber: v("line-number"),

  // Shadows (full box-shadow strings so dark can go much heavier)
  shadowSm: v("shadow-sm"),
  shadowMd: v("shadow-md"),
  shadowLg: v("shadow-lg"),
  shadowXl: v("shadow-xl"),
  shadowPanel: v("shadow-panel"),

  // Code editor
  codeGutterBg: v("code-gutter-bg"),
  codeTag: v("code-tag"),
  codeAttr: v("code-attr"),
  codeStr: v("code-str"),
  codePunc: v("code-punc"),
  codeText: v("code-text"),
  codeComment: v("code-comment"),
  codeTypedBg: v("code-typed-bg"),

  // The fake Acme Hardware site shown in the preview/chat scenes
  siteBg: v("site-bg"),
  siteText: v("site-text"),
  siteMuted: v("site-muted"),
  siteNav: v("site-nav"),
  siteBorder: v("site-border"),
  siteTile: v("site-tile"),
  siteFooter: v("site-footer"),

  // Radii
  radiusLg: 16,
  radiusMd: 8,
};

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const FPS = 30;
