import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientGlow } from "../shared/GradientGlow";
import { ParticleField } from "../shared/ParticleField";
import { Caption } from "../shared/Caption";
import { CodeEditor, Line } from "../shared/CodeEditor";
import { theme } from "../shared/theme";

// Scene 3: split screen. Left is the site's real index.html being edited,
// right is the same site running live. The moment the script tag is saved,
// the chat bubble appears in the preview — cause and effect, side by side.

const TYPE_START = 18;
const SAVE_FRAME = 84;
const WIDGET_FRAME = 92;

const t = (text: string, k?: Line["toks"][number]["k"]) => ({ t: text, k });

const LINES: Line[] = [
  { toks: [t("<!doctype html>", "punc")] },
  { toks: [t("<html", "tag"), t(" lang", "attr"), t("=", "punc"), t('"en"', "str"), t(">", "tag")] },
  { toks: [t("<head>", "tag")] },
  { indent: 1, toks: [t("<title>", "tag"), t("Acme Hardware"), t("</title>", "tag")] },
  {
    indent: 1,
    toks: [t("<link", "tag"), t(" rel", "attr"), t("=", "punc"), t('"stylesheet"', "str"), t(" href", "attr"), t("=", "punc"), t('"/styles.css"', "str"), t(">", "tag")],
  },
  { indent: 1, typed: true, toks: [t("<!-- Contextly widget -->", "comment")] },
  { indent: 1, typed: true, toks: [t("<script", "tag")] },
  {
    indent: 2,
    typed: true,
    toks: [t("src", "attr"), t("=", "punc"), t('"https://contextly.live/embed.js"', "str")],
  },
  {
    indent: 2,
    typed: true,
    toks: [t("data-project-id", "attr"), t("=", "punc"), t('"acme-hardware"', "str")],
  },
  { indent: 2, typed: true, toks: [t("defer", "attr")] },
  { indent: 1, typed: true, toks: [t("></script>", "tag")] },
  { toks: [t("</head>", "tag")] },
  { toks: [t("<body>", "tag")] },
  { indent: 1, toks: [t("<h1>", "tag"), t("Quality tools for every job."), t("</h1>", "tag")] },
  { toks: [t("</body>", "tag")] },
  { toks: [t("</html>", "tag")] },
];

const LivePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The preview "reloads" the instant the file is saved.
  const reloadFlash = interpolate(
    frame,
    [SAVE_FRAME, SAVE_FRAME + 3, SAVE_FRAME + 14],
    [0, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bubbleIn = spring({
    frame: frame - WIDGET_FRAME,
    fps,
    config: { damping: 11, mass: 0.4, stiffness: 110 },
  });
  const bubbleScale = interpolate(bubbleIn, [0, 1], [0.2, 1], { extrapolateLeft: "clamp" });
  const bubbleOpacity = interpolate(bubbleIn, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // One ripple out of the bubble so the eye lands on it.
  const ripple = interpolate(frame, [WIDGET_FRAME, WIDGET_FRAME + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: theme.surface,
        borderRadius: theme.radiusLg,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadowLg,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#28c840" }} />
        </div>
        <div
          style={{
            flex: 1,
            background: theme.secondary,
            borderRadius: 999,
            padding: "7px 18px",
            fontSize: 16,
            color: theme.mutedForeground,
            fontFamily: "Inter, sans-serif",
            textAlign: "center",
          }}
        >
          acme-hardware.com
        </div>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: theme.mutedForeground,
          }}
        >
          Live
        </span>
      </div>

      {/* Reload flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: theme.accent,
          opacity: reloadFlash * 0.12,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* Site body */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div
          style={{
            padding: "22px 34px",
            borderBottom: `1px solid ${theme.siteBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 20, color: theme.siteText }}>Acme Hardware</span>
          <span style={{ display: "flex", gap: 24, fontSize: 16, color: theme.siteNav }}>
            <span>Shop</span>
            <span>Services</span>
            <span>About</span>
          </span>
        </div>

        <div style={{ padding: "32px 34px 20px", fontFamily: "Inter, sans-serif" }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: theme.siteText, margin: 0 }}>
            Quality tools for every job.
          </h1>
          <p style={{ fontSize: 17, color: theme.siteMuted, marginTop: 8 }}>
            Family-owned hardware supply since 1987.
          </p>
        </div>

        <div style={{ padding: "0 34px", display: "flex", gap: 16 }}>
          {[
            { name: "Cordless Drill Set", price: "$89.99" },
            { name: "10-pc Wrench Kit", price: "$34.50" },
            { name: "Steel Tool Chest", price: "$219.00" },
          ].map((p) => (
            <div
              key={p.name}
              style={{
                flex: 1,
                border: `1px solid ${theme.siteBorder}`,
                borderRadius: 10,
                overflow: "hidden",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <div style={{ height: 84, background: theme.siteTile }} />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.siteText }}>{p.name}</div>
                <div style={{ fontSize: 14, color: theme.siteMuted, marginTop: 2 }}>{p.price}</div>
              </div>
            </div>
          ))}
        </div>

        {/* The widget the script tag just added */}
        <div style={{ position: "absolute", right: 28, bottom: 28 }}>
          {ripple > 0 && ripple < 1 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 76,
                height: 76,
                marginLeft: -38,
                marginTop: -38,
                borderRadius: 999,
                border: `2px solid ${theme.accent}`,
                opacity: (1 - ripple) * 0.5,
                transform: `scale(${1 + ripple * 1.6})`,
              }}
            />
          )}
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              background: theme.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 12px 30px ${theme.accentShadow}`,
              opacity: bubbleOpacity,
              transform: `scale(${bubbleScale})`,
            }}
          >
            {/* Launcher mark — inverse of the Logo mark, on the accent bubble */}
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 34,
                color: theme.primaryForeground,
                lineHeight: 1,
              }}
            >
              C
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmbedCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.7 },
    durationInFrames: 20,
  });
  const leftX = interpolate(inSpring, [0, 1], [-60, 0]);
  const rightX = interpolate(inSpring, [0, 1], [60, 0]);
  const panelOpacity = interpolate(inSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <ParticleField tint={theme.accent} />
      <GradientGlow color={theme.accentGlowSm} size={800} x="50%" y="45%" />

      <div
        style={{
          position: "absolute",
          left: "3%",
          right: "3%",
          top: "6%",
          bottom: "21%",
          display: "flex",
          gap: 28,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            opacity: panelOpacity,
            transform: `translateX(${leftX}px)`,
          }}
        >
          <CodeEditor
            lines={LINES}
            fileName="index.html"
            files={["index.html", "styles.css", "app.js"]}
            typeStartFrame={TYPE_START}
            framesPerChar={0.45}
            savedFrame={SAVE_FRAME}
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            opacity: panelOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          <LivePreview />
        </div>
      </div>

      <Caption
        text="Paste one script tag into your site"
        sub="Save the file — the assistant is live on every page."
        startFrame={SAVE_FRAME - 10}
        accent
      />
    </AbsoluteFill>
  );
};
