import React from "react";
import { theme } from "./theme";

// The Contextly app in a browser window: traffic lights, URL bar, and the
// GlobalNavbar breadcrumb. Shared by the project and knowledge-base scenes so
// the chrome stays identical when the video cuts between them.
//
// The geometry is exported because scenes position their content — and their
// cursor keyframes — against it in canvas pixels.

export const WIN = { x: 77, y: 34, w: 1766, h: 862 };
export const CHROME_H = 54;
export const NAV_H = 56;
export const PAD = 30;
export const INNER_X = WIN.x + PAD;
export const INNER_W = WIN.w - PAD * 2;
export const CONTENT_Y = WIN.y + CHROME_H + NAV_H;

export const AppWindow: React.FC<{
  opacity: number;
  url: string;
  breadcrumb: string[];
}> = ({ opacity, url, breadcrumb }) => (
  <div
    style={{
      position: "absolute",
      left: WIN.x,
      top: WIN.y,
      width: WIN.w,
      height: WIN.h,
      background: theme.surface,
      borderRadius: theme.radiusLg,
      border: `1px solid ${theme.border}`,
      boxShadow: theme.shadowLg,
      opacity,
      overflow: "hidden",
    }}
  >
    {/* Browser chrome */}
    <div
      style={{
        height: CHROME_H,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 18px",
        borderBottom: `1px solid ${theme.border}`,
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
          maxWidth: 520,
          margin: "0 auto",
          background: theme.secondary,
          borderRadius: 999,
          padding: "6px 18px",
          fontSize: 16,
          color: theme.mutedForeground,
          fontFamily: "Inter, sans-serif",
          textAlign: "center",
        }}
      >
        {url}
      </div>
      <div style={{ width: 60 }} />
    </div>

    {/* App nav — matches components/GlobalNavbar.tsx */}
    <div
      style={{
        height: NAV_H,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `0 ${PAD}px`,
        borderBottom: `1px solid ${theme.border}`,
        fontFamily: "Inter, sans-serif",
        fontSize: 18,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: theme.primary,
          color: theme.primaryForeground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 17,
        }}
      >
        C
      </div>
      {breadcrumb.map((crumb, i) => {
        const last = i === breadcrumb.length - 1;
        return (
          <React.Fragment key={crumb}>
            {i > 0 && <span style={{ color: theme.separator }}>/</span>}
            <span
              style={{
                fontWeight: last || i === 0 ? 600 : 400,
                color: last || i === 0 ? theme.foreground : theme.mutedForeground,
              }}
            >
              {crumb}
            </span>
          </React.Fragment>
        );
      })}
      <div style={{ flex: 1 }} />
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: theme.secondary,
          border: `1px solid ${theme.border}`,
        }}
      />
    </div>
  </div>
);
