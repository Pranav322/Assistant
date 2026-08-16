import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { theme } from "./theme";

// Bottom-center caption. Deliberately plain — same type scale and zinc
// neutrals as the landing page, no pill and no accent fill, so it reads as
// part of the page rather than a burned-in subtitle.
export const Caption: React.FC<{
  text: string;
  sub?: string;
  startFrame?: number;
  // ponytail: kept so callers don't churn; the design no longer tints captions.
  accent?: boolean;
}> = ({ text, sub, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const opacity = interpolate(local, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const translateY = interpolate(opacity, [0, 1], [10, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 62,
        opacity,
        transform: `translateX(-50%) translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        textAlign: "center",
        maxWidth: 1200,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 34,
          fontWeight: 600,
          color: theme.foreground,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 20,
            fontWeight: 400,
            color: theme.mutedForeground,
            letterSpacing: "-0.01em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
