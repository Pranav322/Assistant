import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { theme } from "./theme";

export type CursorKey = { frame: number; x: number; y: number };

// A mouse pointer that eases between keyframed positions, with a click ring
// at the frames listed in `clicks`. Positions are in px on the 1920x1080 canvas.
export const Cursor: React.FC<{
  keys: CursorKey[];
  clicks?: number[];
  appearFrame?: number;
}> = ({ keys, clicks = [], appearFrame = 0 }) => {
  const frame = useCurrentFrame();

  const x = interpolate(
    frame,
    keys.map((k) => k.frame),
    keys.map((k) => k.x),
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );
  const y = interpolate(
    frame,
    keys.map((k) => k.frame),
    keys.map((k) => k.y),
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  const opacity = interpolate(frame, [appearFrame, appearFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Press-down squash on the nearest click, plus an expanding ring.
  const clickAt = clicks.find((c) => frame >= c - 3 && frame <= c + 18);
  const press = clickAt
    ? interpolate(frame, [clickAt - 3, clickAt, clickAt + 6], [1, 0.82, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const ring = clickAt
    ? interpolate(frame, [clickAt, clickAt + 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : -1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {ring >= 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: -34,
            top: -34,
            width: 68,
            height: 68,
            borderRadius: 999,
            border: `3px solid ${theme.accent}`,
            opacity: (1 - ring) * 0.6,
            transform: `scale(${0.3 + ring * 1.2})`,
          }}
        />
      )}
      <svg
        width="34"
        height="46"
        viewBox="0 0 24 32"
        style={{ transform: `scale(${press})`, transformOrigin: "0 0", display: "block" }}
      >
        <path
          d="M2 2 L2 24 L8 18.5 L11.8 27.5 L15.6 25.8 L11.9 17.2 L20 17 Z"
          fill={theme.surface}
          stroke={theme.siteText}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
