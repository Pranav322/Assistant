import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { theme } from "./theme";

export const StaggerReveal: React.FC<{
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  center?: boolean;
}> = ({
  text,
  startFrame = 0,
  staggerFrames = 3,
  fontSize = 28,
  fontWeight = 600,
  color = theme.foreground,
  center = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.3em",
        fontFamily: "Inter, sans-serif",
        fontSize,
        fontWeight,
        color,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      {words.map((word, i) => {
        const wordStart = startFrame + i * staggerFrames;
        const local = frame - wordStart;
        const opacity = interpolate(local, [0, 0.3 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const translateY = interpolate(opacity, [0, 1], [10, 0]);
        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};