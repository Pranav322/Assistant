import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "./theme";

// An editor pane: file tree, tab bar, gutter, syntax colours.
// Lines marked `typed` are revealed character by character so it reads as
// someone actually editing the file — untyped lines are already on disk.

export type Tok = { t: string; k?: keyof typeof TOKEN_COLORS };
export type Line = { toks: Tok[]; indent?: number; typed?: boolean };

const TOKEN_COLORS = {
  tag: theme.codeTag,
  attr: theme.codeAttr,
  str: theme.codeStr,
  punc: theme.codePunc,
  text: theme.codeText,
  comment: theme.codeComment,
};

const FONT = "'SF Mono', Menlo, Consolas, monospace";
const FONT_SIZE = 21;
const LINE_HEIGHT = 34;

export const CodeEditor: React.FC<{
  lines: Line[];
  fileName: string;
  files: string[];
  typeStartFrame: number;
  framesPerChar?: number;
  savedFrame?: number;
}> = ({
  lines,
  fileName,
  files,
  typeStartFrame,
  framesPerChar = 0.55,
  savedFrame,
}) => {
  const frame = useCurrentFrame();
  const revealed = Math.max(
    0,
    Math.floor((frame - typeStartFrame) / framesPerChar)
  );

  // Walk the typed lines, handing each one its slice of the reveal budget.
  let consumed = 0;
  const rendered = lines.map((line, i) => {
    const raw = line.toks.map((tk) => tk.t).join("");
    if (!line.typed) return { line, i, show: raw.length, visible: true };
    const start = consumed;
    consumed += raw.length + 1; // +1 so the newline costs a beat too
    const show = Math.max(0, Math.min(raw.length, revealed - start));
    return { line, i, show, visible: revealed > start };
  });

  const typingDone = revealed >= consumed;
  const lastTypedIndex = lines.reduce((acc, l, i) => (l.typed ? i : acc), -1);
  const cursorOn = typingDone ? Math.floor(frame / 15) % 2 === 0 : true;
  const saved = savedFrame !== undefined && frame >= savedFrame;

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
      }}
    >
      {/* Title bar */}
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
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: theme.mutedForeground,
          }}
        >
          acme-hardware — your site&apos;s code
        </span>
        <div style={{ flex: 1 }} />
        {savedFrame !== undefined && (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: saved ? theme.success : theme.mutedForeground,
              opacity: saved ? 1 : 0.5,
              transition: "none",
            }}
          >
            {saved ? "Saved" : "Editing…"}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* File tree */}
        <div
          style={{
            width: 210,
            flexShrink: 0,
            borderRight: `1px solid ${theme.border}`,
            background: theme.surfaceMuted,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.mutedForeground,
              padding: "0 8px 8px",
            }}
          >
            Files
          </div>
          {files.map((f) => {
            const active = f === fileName;
            return (
              <div
                key={f}
                style={{
                  fontFamily: FONT,
                  fontSize: 16,
                  padding: "7px 10px",
                  borderRadius: 8,
                  background: active ? theme.accentMuted : "transparent",
                  color: active ? theme.accent : theme.mutedForeground,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {f}
              </div>
            );
          })}
        </div>

        {/* Editor pane */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Tab */}
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${theme.border}`,
              background: theme.surfaceMuted,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 16,
                padding: "11px 20px",
                background: theme.surface,
                borderRight: `1px solid ${theme.border}`,
                borderBottom: "2px solid " + theme.accent,
                color: theme.foreground,
                fontWeight: 600,
              }}
            >
              {fileName}
            </div>
          </div>

          {/* Code */}
          <div style={{ flex: 1, padding: "18px 0", overflow: "hidden" }}>
            {rendered.map(({ line, i, show, visible }) => {
              if (!visible) return null;
              // The caret sits on the line currently being typed, then parks
              // on the last inserted line once typing finishes.
              const lineLen = line.toks.reduce((n, t) => n + t.t.length, 0);
              const isLastTyped =
                !!line.typed &&
                (typingDone ? i === lastTypedIndex : show < lineLen);

              // Slice the tokens so highlighting survives partial reveal.
              let budget = show;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    height: LINE_HEIGHT,
                    alignItems: "center",
                    background: line.typed ? theme.codeTypedBg : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      flexShrink: 0,
                      textAlign: "right",
                      paddingRight: 16,
                      fontFamily: FONT,
                      fontSize: FONT_SIZE - 3,
                      color: theme.lineNumber,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: FONT_SIZE,
                      whiteSpace: "pre",
                      color: TOKEN_COLORS.text,
                    }}
                  >
                    {"  ".repeat(line.indent ?? 0)}
                    {line.toks.map((tk, ti) => {
                      if (budget <= 0) return null;
                      const piece = tk.t.slice(0, budget);
                      budget -= piece.length;
                      return (
                        <span key={ti} style={{ color: TOKEN_COLORS[tk.k ?? "text"] }}>
                          {piece}
                        </span>
                      );
                    })}
                    {isLastTyped && cursorOn && (
                      <span style={{ color: theme.accent }}>&#9611;</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
