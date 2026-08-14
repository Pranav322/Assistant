import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "./theme";

// Small rectangles that burst from the funnel bottom — visual metaphor for chunking.
const PARTICLES = 8;

export const ChunkParticles: React.FC<{ show: boolean }> = ({ show }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: PARTICLES }).map((_, i) => {
        if (!show) return null;
        const local = Math.max(0, frame - i * 2);
        const life = 24;
        const t = interpolate(local, [0, life], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (t >= 1) return null;

        const angle = (i / PARTICLES) * Math.PI * 2 - Math.PI / 2;
        const spread = 50 + i * 8;
        const x = Math.cos(angle) * spread * t;
        const y = Math.sin(angle) * spread * t + 20;
        const opacity = interpolate(t, [0, 0.2, 0.8, 1], [0, 0.9, 0.6, 0]);
        const scale = interpolate(t, [0, 1], [0.6, 1.2]);
        const rotate = t * 60 * (i % 2 === 0 ? 1 : -1);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(50% + 60px)",
              width: 10,
              height: 6,
              borderRadius: 2,
              background: theme.accent,
              opacity,
              transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
            }}
          />
        );
      })}
    </>
  );
};