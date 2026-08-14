// Mirrors the live Contextly landing page's shadcn zinc tokens from
// frontend/app/globals.css, converted to hex. Adds a subtle accent that
// matches the customizable widget default (#4f46e5 / indigo-600).
export const theme = {
  background: "#ffffff",
  foreground: "#09090b",
  primary: "#18181b",
  primaryForeground: "#fafafa",
  secondary: "#f4f4f5",
  mutedForeground: "#71717a",
  border: "#e4e4e7",
  accent: "#4f46e5",
  accentGlow: "rgba(79, 70, 229, 0.12)",
  accentMuted: "#e0e7ff",
  radiusLg: 16,
  radiusMd: 8,
};

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const FPS = 30;