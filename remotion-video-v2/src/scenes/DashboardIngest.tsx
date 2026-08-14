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
import { AppWindow, WIN, INNER_X, INNER_W, CONTENT_Y } from "../shared/AppWindow";
import { theme } from "../shared/theme";

// Scene 2: the actual Contextly dashboard — Knowledge Base tab, mirroring
// frontend/app/projects/[projectId]/tabs/KnowledgeBaseTab.tsx. The cursor
// types a URL, clicks Ingest, and the new source appears in the Data Sources
// table and processes through to completed.
//
// Layout is absolute (not flex) because the cursor keyframes below are canvas
// pixel coordinates and have to land exactly on the Ingest button.

const TABS_Y = CONTENT_Y + 20;
const TABS_H = 50;

const CARDS_Y = TABS_Y + TABS_H + 20;
const CARDS_H = 200;
const CARD_GAP = 24;
const CARD_W = (INNER_W - CARD_GAP) / 2;
const RIGHT_CARD_X = INNER_X + CARD_W + CARD_GAP;

// The Ingest button and URL field — cursor targets are derived from these.
const FIELD_ROW_Y = CARDS_Y + 150;
const FIELD_H = 46;
const BTN_W = 132;
const BTN_X = RIGHT_CARD_X + CARD_W - 22 - BTN_W;
const INPUT_X = RIGHT_CARD_X + 22;
const INPUT_W = BTN_X - 14 - INPUT_X;

const TABLE_Y = CARDS_Y + CARDS_H + 22;

const URL_TEXT = "https://acme-hardware.com/faq";
const TYPE_START = 34;
const TYPE_FPC = 1.3;
const CLICK_INPUT = 28;
const CLICK_INGEST = 92;
const ROW_APPEAR = 100;
const DONE_FRAME = 158;

const CURSOR_KEYS = [
  { frame: 10, x: 700, y: 720 },
  { frame: 26, x: INPUT_X + 120, y: FIELD_ROW_Y + FIELD_H / 2 },
  { frame: 78, x: INPUT_X + 120, y: FIELD_ROW_Y + FIELD_H / 2 },
  { frame: 90, x: BTN_X + BTN_W / 2, y: FIELD_ROW_Y + FIELD_H / 2 },
  { frame: 150, x: BTN_X + BTN_W / 2, y: FIELD_ROW_Y + FIELD_H / 2 },
  { frame: 178, x: INNER_X + INNER_W - 90, y: TABLE_Y + 318 },
];

const card = (highlight: boolean): React.CSSProperties => ({
  position: "absolute",
  borderRadius: 14,
  border: `1px solid ${highlight ? "rgba(79,70,229,0.5)" : theme.border}`,
  background: highlight ? "rgba(79,70,229,0.04)" : "#ffffff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
});

const Spinner: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = theme.accent,
}) => {
  const frame = useCurrentFrame();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${frame * 12}deg)` }}
    >
      <path
        d="M21 12a9 9 0 1 1-6.2-8.6"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

const GlobeIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="1.8" />
    <path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18" stroke="#3b82f6" strokeWidth="1.8" />
  </svg>
);

const FileIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" stroke="#f97316" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14 3v5h5M8.5 13h7M8.5 17h5" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CheckMini: React.FC<{ color?: string }> = ({ color = "#ffffff" }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <path d="M8.5 12.4l2.5 2.5 4.5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Checkbox: React.FC = () => (
  <div
    style={{
      width: 20,
      height: 20,
      borderRadius: 5,
      border: `1.5px solid ${theme.border}`,
      background: "#ffffff",
    }}
  />
);

const TrashIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StatusBadge: React.FC<{ done: boolean; percent: number }> = ({ done, percent }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      minWidth: 116,
      padding: "6px 12px",
      borderRadius: 999,
      background: done ? theme.primary : theme.secondary,
      color: done ? theme.primaryForeground : theme.mutedForeground,
      fontFamily: "Inter, sans-serif",
      fontSize: 16,
      fontWeight: 600,
    }}
  >
    {done ? <CheckMini /> : <Spinner size={15} color={theme.mutedForeground} />}
    {done ? "Completed" : `${percent}%`}
  </div>
);

const TH: React.FC<{ children: React.ReactNode; w: number; right?: boolean }> = ({
  children,
  w,
  right,
}) => (
  <div
    style={{
      width: w,
      flexShrink: 0,
      fontFamily: "Inter, sans-serif",
      fontSize: 16,
      fontWeight: 600,
      color: theme.mutedForeground,
      textAlign: right ? "right" : "left",
    }}
  >
    {children}
  </div>
);

const TD: React.FC<{ children: React.ReactNode; w: number; muted?: boolean }> = ({
  children,
  w,
  muted,
}) => (
  <div
    style={{
      width: w,
      flexShrink: 0,
      fontFamily: "Inter, sans-serif",
      fontSize: 18,
      color: muted ? theme.mutedForeground : theme.foreground,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    {children}
  </div>
);

const COLS = { check: 60, type: 90, name: 520, size: 160, pages: 130, status: 210, created: 190, actions: 80 };

export const DashboardIngest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winIn = spring({ frame, fps, config: { damping: 200, mass: 0.7 }, durationInFrames: 20 });
  const winOpacity = interpolate(winIn, [0, 1], [0, 1]);

  const typed = URL_TEXT.slice(
    0,
    Math.max(0, Math.min(URL_TEXT.length, Math.floor((frame - TYPE_START) / TYPE_FPC)))
  );
  const caretOn = Math.floor(frame / 14) % 2 === 0;
  const focused = frame >= CLICK_INPUT && frame < CLICK_INGEST;

  const ingesting = frame >= CLICK_INGEST && frame < DONE_FRAME;
  const rowVisible = frame >= ROW_APPEAR;
  const rowDone = frame >= DONE_FRAME;
  const percent = Math.round(
    interpolate(frame, [ROW_APPEAR, DONE_FRAME - 4], [4, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const rowIn = spring({
    frame: frame - ROW_APPEAR,
    fps,
    config: { damping: 15, mass: 0.4, stiffness: 120 },
  });

  const readyIn = interpolate(frame, [DONE_FRAME + 6, DONE_FRAME + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#fbfbfc" }}>
      <ParticleField tint={theme.accent} />
      <GradientGlow color="rgba(79,70,229,0.05)" size={800} x="50%" y="40%" />

      <AppWindow
        opacity={winOpacity}
        url="app.contextly.live/projects/acme-hardware"
        breadcrumb={["Contextly", "Projects", "Acme Hardware"]}
      />

      {/* Tabs — Knowledge Base active */}
      <div
        style={{
          position: "absolute",
          left: INNER_X,
          top: TABS_Y,
          height: TABS_H,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: theme.secondary,
          borderRadius: 10,
          padding: 5,
          opacity: winOpacity,
        }}
      >
        {["Knowledge Base", "Customize", "Embed", "Settings"].map((label, i) => (
          <div
            key={label}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              background: i === 0 ? "#ffffff" : "transparent",
              boxShadow: i === 0 ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 18,
              fontWeight: i === 0 ? 600 : 500,
              color: i === 0 ? theme.foreground : theme.mutedForeground,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* File Upload card */}
      <div
        style={{
          ...card(false),
          left: INNER_X,
          top: CARDS_Y,
          width: CARD_W,
          height: CARDS_H,
          opacity: winOpacity,
          padding: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "Inter, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: theme.foreground,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v13M7 8l5-5 5 5" stroke={theme.foreground} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          File Upload
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 17,
            color: theme.mutedForeground,
            marginTop: 8,
          }}
        >
          Upload documents (PDF, TXT, MD) to your knowledge base.
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: theme.foreground,
            marginTop: 20,
          }}
        >
          Select File
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <div
            style={{
              flex: 1,
              height: FIELD_H,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 12,
            }}
          >
            <div
              style={{
                background: theme.primary,
                color: theme.primaryForeground,
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              BROWSE
            </div>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 17,
                color: theme.mutedForeground,
              }}
            >
              return-policy.pdf
            </span>
          </div>
          <div
            style={{
              height: FIELD_H,
              padding: "0 26px",
              borderRadius: 8,
              background: theme.primary,
              color: theme.primaryForeground,
              display: "flex",
              alignItems: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Upload
          </div>
        </div>
      </div>

      {/* URL Ingestion card — the one the cursor drives */}
      <div
        style={{
          ...card(ingesting),
          left: RIGHT_CARD_X,
          top: CARDS_Y,
          width: CARD_W,
          height: CARDS_H,
          opacity: winOpacity,
          padding: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "Inter, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: theme.foreground,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" stroke={theme.foreground} strokeWidth="1.9" strokeLinecap="round" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" stroke={theme.foreground} strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          URL Ingestion
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 17,
            color: theme.mutedForeground,
            marginTop: 8,
          }}
        >
          Crawl and index content from a website URL.
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: theme.foreground,
            marginTop: 20,
          }}
        >
          Target URL
        </div>
      </div>

      {/* URL input — absolute so the cursor keyframes line up exactly */}
      <div
        style={{
          position: "absolute",
          left: INPUT_X,
          top: FIELD_ROW_Y,
          width: INPUT_W,
          height: FIELD_H,
          borderRadius: 8,
          border: `1px solid ${focused ? theme.accent : theme.border}`,
          boxShadow: focused ? `0 0 0 3px rgba(79,70,229,0.15)` : "none",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          color: typed ? theme.foreground : "#a1a1aa",
          opacity: winOpacity,
        }}
      >
        {typed || "https://example.com/docs"}
        {focused && caretOn && (
          <span style={{ marginLeft: 1, color: theme.accent }}>|</span>
        )}
      </div>

      {/* Ingest button */}
      <div
        style={{
          position: "absolute",
          left: BTN_X,
          top: FIELD_ROW_Y,
          width: BTN_W,
          height: FIELD_H,
          borderRadius: 8,
          border: `1px solid ${ingesting ? theme.accent : theme.border}`,
          background: ingesting ? "rgba(79,70,229,0.06)" : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          fontWeight: 600,
          color: ingesting ? theme.accent : theme.foreground,
          opacity: winOpacity,
        }}
      >
        {ingesting ? (
          <>
            <Spinner size={16} /> Ingesting
          </>
        ) : (
          "Ingest"
        )}
      </div>

      {/* Data Sources table */}
      <div
        style={{
          ...card(false),
          left: INNER_X,
          top: TABLE_Y,
          width: INNER_W,
          height: WIN.y + WIN.h - TABLE_Y - 26,
          opacity: winOpacity,
          padding: "20px 22px",
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: theme.foreground,
          }}
        >
          Data Sources
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 17,
            color: theme.mutedForeground,
            marginTop: 4,
          }}
        >
          Manage your ingested files and URLs.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            padding: "16px 0 12px",
            borderBottom: `1px solid ${theme.border}`,
            marginTop: 10,
          }}
        >
          <TH w={COLS.check}>
            <Checkbox />
          </TH>
          <TH w={COLS.type}>Type</TH>
          <TH w={COLS.name}>Name/URL</TH>
          <TH w={COLS.size}>Size</TH>
          <TH w={COLS.pages}>Pages</TH>
          <TH w={COLS.status}>Status</TH>
          <TH w={COLS.created}>Created</TH>
          <TH w={COLS.actions} right>
            Actions
          </TH>
        </div>

        {/* Existing PDF source */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 0",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <TD w={COLS.check}>
            <Checkbox />
          </TD>
          <TD w={COLS.type}>
            <FileIcon />
          </TD>
          <TD w={COLS.name}>return-policy.pdf</TD>
          <TD w={COLS.size} muted>
            248 KB
          </TD>
          <TD w={COLS.pages} muted>
            6
          </TD>
          <TD w={COLS.status}>
            <StatusBadge done percent={100} />
          </TD>
          <TD w={COLS.created} muted>
            2 hours ago
          </TD>
          <TD w={COLS.actions}>
            <div style={{ marginLeft: "auto" }}>
              <TrashIcon />
            </div>
          </TD>
        </div>

        {/* The URL the cursor just ingested */}
        {rowVisible && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 0",
              borderBottom: `1px solid ${theme.border}`,
              opacity: interpolate(rowIn, [0, 1], [0, 1], { extrapolateLeft: "clamp" }),
              transform: `translateY(${interpolate(rowIn, [0, 1], [14, 0], {
                extrapolateLeft: "clamp",
              })}px)`,
              background: rowDone ? "transparent" : "rgba(79,70,229,0.04)",
            }}
          >
            <TD w={COLS.check}>
              <Checkbox />
            </TD>
            <TD w={COLS.type}>
              <GlobeIcon />
            </TD>
            <TD w={COLS.name}>acme-hardware.com/faq</TD>
            <TD w={COLS.size} muted>
              {rowDone ? "1.2 MB" : "—"}
            </TD>
            <TD w={COLS.pages} muted>
              {rowDone ? "24" : "—"}
            </TD>
            <TD w={COLS.status}>
              <StatusBadge done={rowDone} percent={percent} />
            </TD>
            <TD w={COLS.created} muted>
              just now
            </TD>
            <TD w={COLS.actions}>
              <div style={{ marginLeft: "auto" }}>
                <TrashIcon />
              </div>
            </TD>
          </div>
        )}

        {/* Ready-to-test banner, exactly as the app shows it once sources land */}
        <div
          style={{
            marginTop: 22,
            borderRadius: 16,
            border: `1px solid rgba(79,70,229,0.2)`,
            background: "rgba(79,70,229,0.05)",
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: readyIn,
            transform: `translateY(${interpolate(readyIn, [0, 1], [10, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(79,70,229,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 4l14 8-14 8z" fill={theme.accent} />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: theme.foreground,
                }}
              >
                Ready to test your chatbot?
              </div>
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 17,
                  color: theme.mutedForeground,
                  marginTop: 2,
                }}
              >
                Chat with your bot using 2 documents
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: theme.primary,
              color: theme.primaryForeground,
              fontFamily: "Inter, sans-serif",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Test Chatbot
          </div>
        </div>
      </div>

      <Cursor keys={CURSOR_KEYS} clicks={[CLICK_INPUT, CLICK_INGEST]} appearFrame={8} />

      <Caption
        text="Drop in a link or a PDF. That's the whole setup."
        sub="Contextly crawls every page, splits it into chunks, and stores the embeddings."
        startFrame={ROW_APPEAR - 6}
        accent
      />
    </AbsoluteFill>
  );
};
