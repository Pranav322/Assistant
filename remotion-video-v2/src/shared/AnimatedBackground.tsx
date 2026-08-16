import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "./theme";

// Subtle dot grid that drifts slowly — adds depth without distracting.
// Scaled for 1920x1080.
const DOT_SIZE = 2;
const DOT_GAP = 48;
const ROWS = 24;
const COLS = 42;

export const AnimatedBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
      >
        {Array.from({ length: ROWS }).flatMap((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const x = c * DOT_GAP + DOT_GAP / 2;
            const y = r * DOT_GAP + DOT_GAP / 2;
            const drift = Math.sin(frame * 0.004 + c * 0.3 + r * 0.2) * 3;
            return (
              <circle
                key={`${r}-${c}`}
                cx={x}
                cy={y + drift}
                r={DOT_SIZE / 2}
                fill={theme.border}
                opacity={0.35}
              />
            );
          })
        )}
      </svg>
    </div>
  );
};