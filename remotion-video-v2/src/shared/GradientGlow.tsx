import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "./theme";

export const GradientGlow: React.FC<{
  color?: string;
  size?: number;
  x?: string;
  y?: string;
}> = ({ color = theme.accentGlowMd, size = 600, x = "50%", y = "50%" }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame * 0.02) * 0.3;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) scale(${pulse})`,
        borderRadius: 999,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
  );
};