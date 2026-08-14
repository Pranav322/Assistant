import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedBackground } from "../shared/AnimatedBackground";
import { ParticleField } from "../shared/ParticleField";
import { GradientGlow } from "../shared/GradientGlow";
import { StaggerReveal } from "../shared/StaggerReveal";
import { Logo } from "../shared/Logo";
import { theme } from "../shared/theme";

// Scene 5: Closing CTA.
// Logo scales in big → tagline stagger → URL → particles.

export const OutroCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({
    frame: frame - 6,
    fps,
    config: { damping: 10, mass: 0.35, stiffness: 90 },
  });
  const logoScale = interpolate(logoS, [0, 1], [0.4, 1], {
    extrapolateLeft: "clamp",
  });
  const logoOpacity = interpolate(logoS, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
  });

  // URL fade in (late)
  const urlOpacity = interpolate(frame, [65, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlY = interpolate(urlOpacity, [0, 1], [10, 0]);

  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <AnimatedBackground />
      <ParticleField tint={theme.accent} />

      {/* Central glow behind logo */}
      <GradientGlow
        color="rgba(79,70,229,0.1)"
        size={450}
        x="50%"
        y="45%"
      />

      {/* Top-right accent glow for depth */}
      <GradientGlow
        color="rgba(79,70,229,0.06)"
        size={350}
        x="80%"
        y="25%"
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        <Logo markSize={56} scale={1.6} />
      </div>

      {/* Tagline */}
      <div style={{ marginTop: 4 }}>
        <StaggerReveal
          text="Any website. A working chatbot. Minutes."
          startFrame={24}
          staggerFrames={4}
          fontSize={28}
          fontWeight={600}
          center
        />
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          transform: `translateY(${urlY}px)`,
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          fontWeight: 500,
          color: theme.mutedForeground,
          letterSpacing: "0.02em",
          marginTop: 4,
        }}
      >
        contextly.live
      </div>
    </AbsoluteFill>
  );
};