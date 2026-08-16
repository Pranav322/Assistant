import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// Wraps an SVG icon with a spring entrance animation.
export const AnimatedIcon: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  size?: number;
}> = ({ children, startFrame = 0, size = 48 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const s = spring({ frame: local, fps, config: { damping: 12, mass: 0.5 } });
  const scale = interpolate(s, [0, 1], [0.3, 1], { extrapolateLeft: "clamp" });
  const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateLeft: "clamp" });

  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `scale(${scale})`,
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
};

// Inline SVG icons used across scenes.

export const PdfIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = "#ef4444",
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="12" y="6" width="40" height="52" rx="6" fill={color} opacity="0.15" />
    <rect x="12" y="6" width="40" height="52" rx="6" stroke={color} strokeWidth="2" />
    <text x="32" y="24" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="sans-serif">PDF</text>
    <rect x="20" y="30" width="24" height="3" rx="1.5" fill={color} opacity="0.5" />
    <rect x="20" y="37" width="18" height="3" rx="1.5" fill={color} opacity="0.35" />
    <rect x="20" y="44" width="22" height="3" rx="1.5" fill={color} opacity="0.35" />
    <rect x="20" y="51" width="16" height="3" rx="1.5" fill={color} opacity="0.25" />
  </svg>
);

export const LinkIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = "#6366f1",
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="12" y="6" width="40" height="52" rx="6" fill={color} opacity="0.1" />
    <rect x="12" y="6" width="40" height="52" rx="6" stroke={color} strokeWidth="2" />
    <circle cx="28" cy="26" r="4" stroke={color} strokeWidth="2" />
    <circle cx="38" cy="38" r="4" stroke={color} strokeWidth="2" />
    <line x1="31" y1="29" x2="35" y2="35" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <text x="32" y="54" textAnchor="middle" fill={color} fontSize="10" fontWeight="600" fontFamily="sans-serif">URL</text>
  </svg>
);

export const DbIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 44,
  color = "#4f46e5",
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="16" rx="18" ry="7" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
    <line x1="14" y1="16" x2="14" y2="46" stroke={color} strokeWidth="2" />
    <line x1="50" y1="16" x2="50" y2="46" stroke={color} strokeWidth="2" />
    <ellipse cx="32" cy="46" rx="18" ry="7" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
    <ellipse cx="32" cy="31" rx="18" ry="7" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.5" opacity="0.5" />
  </svg>
);

export const SearchIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = "#71717a",
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <circle cx="28" cy="28" r="12" stroke={color} strokeWidth="2.5" />
    <line x1="37" y1="37" x2="46" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 32,
  color = "#22c55e",
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" fill={color} opacity="0.15" />
    <path d="M10 16.5l4 4 8-8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);