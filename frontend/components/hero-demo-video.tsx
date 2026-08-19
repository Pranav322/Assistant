"use client";

import { useTheme } from "next-themes";

// resolvedTheme is undefined on the server and on the client's first render
// (next-themes resolves it from localStorage/matchMedia in its own internal
// effect, not ours) — so this deterministically renders the light cut until
// next-themes itself updates, with no hydration mismatch or manual
// mounted-state bookkeeping needed on our end.
export function HeroDemoVideo() {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? "/video/hero-demo-dark.mp4" : "/video/hero-demo.mp4";

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
