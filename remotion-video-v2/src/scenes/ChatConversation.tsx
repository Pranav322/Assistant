import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { ParticleField } from "../shared/ParticleField";
import { GradientGlow } from "../shared/GradientGlow";
import { Caption } from "../shared/Caption";
import { Logo } from "../shared/Logo";
import { PdfIcon, CheckIcon } from "../shared/AnimatedIcon";
import { theme, EASE_OUT_EXPO } from "../shared/theme";

// Scene 4: Chat conversation in the widget.
// Chat panel slides in → user asks → retrieval status feed with animated
// doc icons → typing dots → answer → source pills animate in.

const STATUS_STEPS = [
  {
    text: "Searching return-policy.pdf…",
    start: 28,
    end: 54,
    doc: "pdf",
  },
  {
    text: "Reranking 6 matches by relevance…",
    start: 54,
    end: 84,
    doc: "search",
  },
];
const DOTS_START = 84;
const DOTS_END = 104;
const ANSWER_START = 110;
const SOURCES_START = 148;

const TypingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const t = (frame - delay) / 10;
  const bounce = Math.max(0, Math.sin(t) ** 2);
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: theme.mutedForeground,
        transform: `translateY(${-bounce * 4}px)`,
      }}
    />
  );
};

const fadeSlideIn = (frame: number, startFrame: number, duration = 14) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...EASE_OUT_EXPO),
    }
  );
  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [8, 0])}px)`,
  };
};

const StatusFeed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = 0.5 + 0.5 * Math.sin(frame / 4);

  const feedOpacity = interpolate(
    frame,
    [STATUS_STEPS[0].start, STATUS_STEPS[0].start + 6, DOTS_START, DOTS_END],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: feedOpacity,
        width: "fit-content",
        maxWidth: "92%",
      }}
    >
      {STATUS_STEPS.map((step, idx) => {
        const stepOpacity = interpolate(
          frame,
          [step.start, step.start + 6, step.end - 6, step.end],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        if (stepOpacity <= 0) return null;

        const iconSpring = spring({
          frame: frame - step.start,
          fps,
          config: { damping: 12, mass: 0.4 },
        });
        const iconScale = interpolate(iconSpring, [0, 1], [0.5, 1], {
          extrapolateLeft: "clamp",
        });

        return (
          <div
            key={step.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: stepOpacity,
              background: theme.secondary,
              borderRadius: 14,
              padding: "9px 12px",
            }}
          >
            <div
              style={{
                transform: `scale(${idx === 0 ? iconScale : 1})`,
                display: "flex",
                flexShrink: 0,
              }}
            >
              {step.doc === "pdf" ? (
                <PdfIcon size={18} />
              ) : (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: theme.accent,
                      opacity: 0.5 + pulse * 0.5,
                    }}
                  />
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 15,
                color: theme.mutedForeground,
              }}
            >
              {step.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const ChatConversation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chat card entrance
  const cardSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 20,
  });
  const cardScale = interpolate(cardSpring, [0, 1], [0.92, 1]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  const dotsOpacity = interpolate(
    frame,
    [DOTS_START, DOTS_START + 4, DOTS_END, DOTS_END + 6],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <ParticleField tint={theme.accent} />
      <GradientGlow
        color={theme.accentGlowMd}
        size={500}
        x="75%"
        y="60%"
      />

      {/* Browser content — generic site background */}
      <div
        style={{
          position: "absolute",
          left: "6%",
          right: "6%",
          top: "6%",
          bottom: "20%",
          borderRadius: theme.radiusLg,
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
          background: theme.background,
          boxShadow: theme.shadowMd,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Browser bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "12px 20px",
            borderBottom: `1px solid ${theme.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840" }} />
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: 380,
              margin: "0 auto",
              background: theme.secondary,
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 13,
              color: theme.mutedForeground,
              fontFamily: "Inter, sans-serif",
              textAlign: "center",
            }}
          >
            acme-hardware.com
          </div>
          <div style={{ width: 42 }} />
        </div>

        {/* Site body */}
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={{
              padding: "32px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h1
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 32,
                fontWeight: 700,
                color: theme.siteText,
                margin: 0,
              }}
            >
              Hardware supply since 1987.
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: theme.siteMuted, margin: 0 }}>
              Quality tools, fast shipping, expert advice.
            </p>
          </div>

          {/* Product grid */}
          <div style={{ padding: "8px 48px", display: "flex", gap: 14 }}>
            {[
              { name: "Cordless Drill Set", price: "$89.99" },
              { name: "10-pc Wrench Kit", price: "$34.50" },
              { name: "Steel Tool Chest", price: "$219.00" },
              { name: "Safety Gear Bundle", price: "$58.25" },
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  border: `1px solid ${theme.siteBorder}`,
                  overflow: "hidden",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <div style={{ height: 60, background: theme.siteTile }} />
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.siteText }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: theme.siteMuted, marginTop: 2 }}>{p.price}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer — fills the remaining space, reads as a real site */}
          <div
            style={{
              position: "absolute",
              left: 48,
              right: 48,
              bottom: 28,
              paddingTop: 20,
              borderTop: `1px solid ${theme.siteBorder}`,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: theme.siteFooter,
            }}
          >
            <span>&copy; 1987&ndash;2026 Acme Hardware Co.</span>
            <span style={{ display: "flex", gap: 20 }}>
              <span>Store Locator</span>
              <span>Warranty</span>
            </span>
          </div>
        </div>

        {/* Chat widget card — overlay right side */}
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            width: 470,
            height: 560,
            borderRadius: theme.radiusLg,
            overflow: "hidden",
            border: `1px solid ${theme.border}`,
            background: theme.background,
            boxShadow: theme.shadowPanel,
            transform: `scale(${cardScale})`,
            opacity: cardOpacity,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Widget header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: `1px solid ${theme.border}`,
              flexShrink: 0,
            }}
          >
            <Logo markSize={26} showWordmark={false} />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 18,
                color: theme.foreground,
              }}
            >
              Acme Hardware Assistant
            </span>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {/* User message */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                ...fadeSlideIn(frame, 4),
              }}
            >
              <div
                style={{
                  background: theme.primary,
                  color: theme.primaryForeground,
                  borderRadius: 12,
                  padding: "9px 13px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 17,
                  maxWidth: "80%",
                }}
              >
                What&apos;s your return policy?
              </div>
            </div>

            {/* Retrieval status feed */}
            <StatusFeed />

            {/* Typing dots */}
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                background: theme.secondary,
                borderRadius: 14,
                padding: "11px 13px",
                width: "fit-content",
                opacity: dotsOpacity,
              }}
            >
              <TypingDot delay={DOTS_START} />
              <TypingDot delay={DOTS_START + 4} />
              <TypingDot delay={DOTS_START + 8} />
            </div>

            {/* Answer */}
            <div
              style={{
                ...fadeSlideIn(frame, ANSWER_START),
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  background: theme.secondary,
                  color: theme.foreground,
                  borderRadius: 12,
                  padding: "11px 13px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 17,
                  lineHeight: 1.5,
                  maxWidth: "92%",
                }}
              >
                Returns accepted within 30 days with receipt. After 45 days, we issue store credit
                instead of a refund.
              </div>

              {/* Sources */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  ...fadeSlideIn(frame, SOURCES_START, 12),
                }}
              >
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.mutedForeground,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Sources
                </span>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {["Return_Policy.pdf", "FAQ — Returns"].map((label, idx) => {
                    const pillIn = spring({
                      frame: frame - SOURCES_START - idx * 4,
                      fps,
                      config: { damping: 14, mass: 0.4 },
                    });
                    const pillS = interpolate(pillIn, [0, 1], [0.6, 1], {
                      extrapolateLeft: "clamp",
                    });
                    const pillO = interpolate(pillIn, [0, 1], [0, 1], {
                      extrapolateLeft: "clamp",
                    });
                    return (
                      <div
                        key={label}
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: 999,
                          padding: "4px 9px",
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          color: theme.foreground,
                          opacity: pillO,
                          transform: `scale(${pillS})`,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckIcon size={12} />
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Caption
        text="Answers from your content. With sources."
        startFrame={SOURCES_START - 6}
        accent
      />
    </AbsoluteFill>
  );
};