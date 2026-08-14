import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "./theme";

// Floating translucent circles for atmosphere behind key scenes.
const PARTICLES = 18;

export const ParticleField: React.FC<{ tint?: string }> = ({
  tint = theme.accent,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {Array.from({ length: PARTICLES }).map((_, i) => {
        const seed = i * 137.5;
        const x =
          ((Math.sin(frame * 0.002 + seed) + 1) / 2) * 90 + 5;
        const y =
          ((Math.cos(frame * 0.0017 + seed * 1.3) + 1) / 2) * 85 + 5;
        const size = 6 + ((seed * 31) % 20);
        const opacity = 0.04 + ((seed * 17) % 8) * 0.007;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: 999,
              background: tint,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};