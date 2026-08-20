"use client";

import { useEffect, useState } from "react";

// Served from Cloudflare R2 (zero egress cost) instead of bundled as a
// Vercel static asset — keeps large re-renderable video binaries out of
// git history and off Vercel's bandwidth as this page scales.
const ASSETS_BASE_URL =
  process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://pub-45254b84e2fa4807b488766ecf42a2b8.r2.dev";
const LIGHT_SRC = `${ASSETS_BASE_URL}/marketing/hero-demo.mp4`;
const DARK_SRC = `${ASSETS_BASE_URL}/marketing/hero-demo-dark.mp4`;

export function HeroDemoVideo() {
  const [src, setSrc] = useState(LIGHT_SRC);

  useEffect(() => {
    // The `dark` class on <html> is set directly by next-themes' own
    // blocking script (before paint) or by the toggle — external DOM state
    // next-themes owns, not a prop/context value we can just derive during
    // render. useTheme()'s resolvedTheme lagged behind this on first mount
    // for system-dark sessions (showed the light cut until a manual toggle
    // forced a re-render), so this reads the class directly and stays in
    // sync via MutationObserver instead of trusting hook timing.
    const root = document.documentElement;
    const sync = () => setSrc(root.classList.contains("dark") ? DARK_SRC : LIGHT_SRC);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <video
      key={src}
      className="block aspect-video w-full"
      src={src}
      autoPlay
      loop
      muted
      playsInline
    />
  );
}
