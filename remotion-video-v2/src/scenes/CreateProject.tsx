import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ParticleField } from "../shared/ParticleField";
import { GradientGlow } from "../shared/GradientGlow";
import { Caption } from "../shared/Caption";
import { Cursor } from "../shared/Cursor";
import { AppWindow, INNER_X, INNER_W, CONTENT_Y } from "../shared/AppWindow";
import { theme } from "../shared/theme";

// Scene 1: the first thing a real user does — create a project.
// Mirrors frontend/app/projects/page.tsx: the Projects list with its empty
// state, the New Project button, and the Create New Project modal
// (Project Name + Allowed Origin), ending with the new project card.
//
// Absolute layout: CURSOR_KEYS are canvas pixel coordinates derived from
// these same constants, so the pointer always lands on the real control.

const HEADER_Y = CONTENT_Y + 26;
const NEW_BTN = { w: 210, h: 48, x: INNER_X + INNER_W - 210, y: CONTENT_Y + 30 };

const EMPTY_Y = HEADER_Y + 108;

// Modal geometry
const MODAL_W = 720;
const MODAL_X = (1920 - MODAL_W) / 2;
const MODAL_Y = 210;
const FIELD_X = MODAL_X + 40;
const FIELD_W = MODAL_W - 80;
const FIELD_H = 52;
const NAME_Y = MODAL_Y + 132;
const ORIGIN_Y = MODAL_Y + 250;
const CREATE_BTN = { w: 200, h: 48, x: MODAL_X + MODAL_W - 40 - 200, y: MODAL_Y + 420 };

const NAME_TEXT = "Acme Hardware";
const ORIGIN_TEXT = "https://acme-hardware.com";

const CLICK_NEW = 30;
const MODAL_IN = 34;
const NAME_TYPE_START = 46;
const NAME_FPC = 1.7;
const CLICK_ORIGIN = 78;
const ORIGIN_TYPE_START = 84;
const ORIGIN_FPC = 1.5;
const CLICK_CREATE = 140;
const CREATED_FRAME = 164;
const CARD_FRAME = 170;

const CURSOR_KEYS = [
  { frame: 8, x: 900, y: 780 },
  { frame: 26, x: NEW_BTN.x + NEW_BTN.w / 2, y: NEW_BTN.y + NEW_BTN.h / 2 },
  { frame: 40, x: NEW_BTN.x + NEW_BTN.w / 2, y: NEW_BTN.y + NEW_BTN.h / 2 },
  { frame: 50, x: FIELD_X + 150, y: NAME_Y + FIELD_H / 2 },
  { frame: 72, x: FIELD_X + 150, y: NAME_Y + FIELD_H / 2 },
  { frame: 78, x: FIELD_X + 200, y: ORIGIN_Y + FIELD_H / 2 },
  { frame: 128, x: FIELD_X + 200, y: ORIGIN_Y + FIELD_H / 2 },
  { frame: 138, x: CREATE_BTN.x + CREATE_BTN.w / 2, y: CREATE_BTN.y + CREATE_BTN.h / 2 },
  { frame: 168, x: CREATE_BTN.x + CREATE_BTN.w / 2, y: CREATE_BTN.y + CREATE_BTN.h / 2 },
  { frame: 196, x: INNER_X + 96, y: EMPTY_Y + 198 },
];

const PlusIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = theme.primaryForeground,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const TerminalIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M5 7l4 4-4 4M12 15h7" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GearIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3.2" stroke={theme.mutedForeground} strokeWidth="1.8" />
    <path
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.3 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"
      stroke={theme.mutedForeground}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Field: React.FC<{
  x: number;
  y: number;
  w: number;
  label: string;
  placeholder: string;
  value: string;
  focused: boolean;
  caretOn: boolean;
  hint?: string;
  opacity: number;
}> = ({ x, y, w, label, placeholder, value, focused, caretOn, hint, opacity }) => (
  <>
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 30,
        fontFamily: "Inter, sans-serif",
        fontSize: 17,
        fontWeight: 600,
        color: theme.foreground,
        opacity,
      }}
    >
      {label}
    </div>
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: FIELD_H,
        borderRadius: 8,
        border: `1px solid ${focused ? theme.accent : theme.border}`,
        boxShadow: focused ? `0 0 0 3px ${theme.accentRing}` : "none",
        background: theme.inputBg,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        fontFamily: "Inter, sans-serif",
        fontSize: 19,
        color: value ? theme.foreground : theme.placeholder,
        opacity,
      }}
    >
      {value || placeholder}
      {focused && caretOn && <span style={{ marginLeft: 1, color: theme.accent }}>|</span>}
    </div>
    {hint && (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y + FIELD_H + 10,
          width: w,
          fontFamily: "Inter, sans-serif",
          fontSize: 15,
          lineHeight: 1.4,
          color: theme.mutedForeground,
          opacity,
        }}
      >
        {hint}
      </div>
    )}
  </>
);

export const CreateProject: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winIn = spring({ frame, fps, config: { damping: 200, mass: 0.7 }, durationInFrames: 20 });
  const winOpacity = interpolate(winIn, [0, 1], [0, 1]);

  const caretOn = Math.floor(frame / 14) % 2 === 0;

  const modalIn = spring({
    frame: frame - MODAL_IN,
    fps,
    config: { damping: 16, mass: 0.4, stiffness: 130 },
  });
  const modalOut = interpolate(frame, [CREATED_FRAME, CREATED_FRAME + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const modalOpacity =
    interpolate(modalIn, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    modalOut;
  const modalScale = interpolate(modalIn, [0, 1], [0.94, 1], { extrapolateLeft: "clamp" });

  const nameValue = NAME_TEXT.slice(
    0,
    Math.max(0, Math.min(NAME_TEXT.length, Math.floor((frame - NAME_TYPE_START) / NAME_FPC)))
  );
  const originValue = ORIGIN_TEXT.slice(
    0,
    Math.max(0, Math.min(ORIGIN_TEXT.length, Math.floor((frame - ORIGIN_TYPE_START) / ORIGIN_FPC)))
  );

  const nameFocused = frame >= MODAL_IN + 6 && frame < CLICK_ORIGIN;
  const originFocused = frame >= CLICK_ORIGIN && frame < CLICK_CREATE;
  const creating = frame >= CLICK_CREATE && frame < CREATED_FRAME;

  const cardIn = spring({
    frame: frame - CARD_FRAME,
    fps,
    config: { damping: 15, mass: 0.4, stiffness: 120 },
  });
  const cardVisible = frame >= CARD_FRAME;
  const emptyOpacity = interpolate(frame, [CARD_FRAME - 8, CARD_FRAME], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.backdrop }}>
      <ParticleField tint={theme.accent} />
      <GradientGlow color={theme.accentGlowSm} size={800} x="50%" y="40%" />

      <AppWindow opacity={winOpacity} breadcrumb={["Contextly", "Projects"]} url="app.contextly.live/projects" />

      {/* Page header */}
      <div
        style={{
          position: "absolute",
          left: INNER_X,
          top: HEADER_Y,
          opacity: winOpacity,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: theme.foreground,
          }}
        >
          Projects
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 19,
            color: theme.mutedForeground,
            marginTop: 6,
          }}
        >
          Manage your assistants and integrations.
        </div>
      </div>

      {/* New Project button */}
      <div
        style={{
          position: "absolute",
          left: NEW_BTN.x,
          top: NEW_BTN.y,
          width: NEW_BTN.w,
          height: NEW_BTN.h,
          borderRadius: 8,
          background: theme.primary,
          color: theme.primaryForeground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontFamily: "Inter, sans-serif",
          fontSize: 19,
          fontWeight: 600,
          opacity: winOpacity,
        }}
      >
        <PlusIcon />
        New Project
      </div>

      {/* Empty state — swapped for the project card once it is created */}
      {!cardVisible && (
        <div
          style={{
            position: "absolute",
            left: INNER_X,
            top: EMPTY_Y,
            width: INNER_W,
            height: 330,
            borderRadius: 14,
            border: `2px dashed ${theme.border}`,
            background: theme.emptyFill,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            opacity: winOpacity * emptyOpacity,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              background: theme.emptyCircle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PlusIcon size={34} color={theme.mutedForeground} />
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 24,
              fontWeight: 600,
              color: theme.foreground,
            }}
          >
            No projects yet
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 19,
              color: theme.mutedForeground,
            }}
          >
            Create your first RAG assistant to get started.
          </div>
        </div>
      )}

      {/* The created project card */}
      {cardVisible && (
        <div
          style={{
            position: "absolute",
            left: INNER_X,
            top: EMPTY_Y,
            width: (INNER_W - 32) / 3,
            borderRadius: 14,
            border: `1px solid ${theme.border}`,
            background: theme.surface,
            boxShadow: theme.shadowMd,
            padding: 22,
            opacity: interpolate(cardIn, [0, 1], [0, 1], { extrapolateLeft: "clamp" }),
            transform: `scale(${interpolate(cardIn, [0, 1], [0.9, 1], {
              extrapolateLeft: "clamp",
            })})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                background: theme.iconTile,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TerminalIcon />
            </div>
            <div
              style={{
                background: theme.secondary,
                borderRadius: 999,
                padding: "5px 12px",
                fontFamily: "'SF Mono', Menlo, monospace",
                fontSize: 13,
                letterSpacing: "0.08em",
                color: theme.mutedForeground,
              }}
            >
              A7F3C9D1
            </div>
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 22,
              fontWeight: 600,
              color: theme.foreground,
              marginTop: 16,
              letterSpacing: "-0.01em",
            }}
          >
            Acme Hardware
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 17,
              color: theme.mutedForeground,
              marginTop: 4,
            }}
          >
            https://acme-hardware.com
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 15,
              color: theme.mutedForeground,
            }}
          >
            Configure <GearIcon />
          </div>
        </div>
      )}

      {/* Modal backdrop */}
      {modalOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.overlay,
            opacity: modalOpacity,
          }}
        />
      )}

      {/* Create New Project modal */}
      {modalOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: MODAL_X,
            top: MODAL_Y,
            width: MODAL_W,
            height: 520,
            borderRadius: 16,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadowXl,
            opacity: modalOpacity,
            transform: `scale(${modalScale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            style={{
              padding: "26px 40px",
              fontFamily: "Inter, sans-serif",
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: theme.foreground,
            }}
          >
            Create New Project
          </div>
        </div>
      )}

      {modalOpacity > 0 && (
        <>
          <Field
            x={FIELD_X}
            y={NAME_Y}
            w={FIELD_W}
            label="Project Name"
            placeholder="e.g. Documentation Assistant"
            value={nameValue}
            focused={nameFocused}
            caretOn={caretOn}
            opacity={modalOpacity}
          />
          <Field
            x={FIELD_X}
            y={ORIGIN_Y}
            w={FIELD_W}
            label="Allowed Origin"
            placeholder="https://example.com"
            value={originValue}
            focused={originFocused}
            caretOn={caretOn}
            hint="The domain where you'll embed the chat widget."
            opacity={modalOpacity}
          />

          {/* Cancel */}
          <div
            style={{
              position: "absolute",
              left: CREATE_BTN.x - 150,
              top: CREATE_BTN.y,
              width: 134,
              height: CREATE_BTN.h,
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: 19,
              fontWeight: 600,
              color: theme.foreground,
              opacity: modalOpacity,
            }}
          >
            Cancel
          </div>

          {/* Create Project */}
          <div
            style={{
              position: "absolute",
              left: CREATE_BTN.x,
              top: CREATE_BTN.y,
              width: CREATE_BTN.w,
              height: CREATE_BTN.h,
              borderRadius: 8,
              background: theme.primary,
              color: theme.primaryForeground,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: 19,
              fontWeight: 600,
              opacity: modalOpacity,
            }}
          >
            {creating ? "Creating..." : "Create Project"}
          </div>
        </>
      )}

      <Cursor keys={CURSOR_KEYS} clicks={[CLICK_NEW, CLICK_ORIGIN, CLICK_CREATE]} appearFrame={6} />

      <Caption
        text="Start with a project"
        sub="Name it, point it at your domain — that's the whole setup step."
        startFrame={CARD_FRAME - 30}
      />
    </AbsoluteFill>
  );
};
