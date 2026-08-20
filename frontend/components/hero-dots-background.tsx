"use client";

import { useEffect, useState } from "react";
import InteractiveDots from "@/components/interactive-dots";

// Matches app/globals.css tokens: light --background/zinc-500, dark
// --background/zinc-400 (dot). Read via .dark class + MutationObserver
// rather than useTheme(), which lagged behind on first mount for
// system-dark sessions (see hero-demo-video.tsx for the same bug).
const LIGHT = { backgroundColor: "#ffffff", dotColor: "#52525b" };
const DARK = { backgroundColor: "#09090b", dotColor: "#a1a1aa" };

export function HeroDotsBackground() {
  const [palette, setPalette] = useState(LIGHT);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setPalette(root.classList.contains("dark") ? DARK : LIGHT);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <InteractiveDots
      backgroundColor={palette.backgroundColor}
      dotColor={palette.dotColor}
      gridSpacing={28}
      animationSpeed={0.005}
      removeWaveLine={false}
    />
  );
}
