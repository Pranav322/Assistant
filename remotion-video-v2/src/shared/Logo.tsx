import React from "react";
import { theme } from "./theme";

type LogoProps = {
  markSize?: number;
  showWordmark?: boolean;
  scale?: number;
};

export const Logo: React.FC<LogoProps> = ({
  markSize = 24,
  showWordmark = true,
  scale = 1,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8 * scale,
      }}
    >
      <div
        style={{
          width: markSize,
          height: markSize,
          borderRadius: markSize * 0.28,
          background: theme.primary,
          color: theme.primaryForeground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: markSize * 0.55,
          lineHeight: 1,
        }}
      >
        C
      </div>
      {showWordmark && (
        <span
          style={{
            fontWeight: 600,
            fontSize: markSize * 0.65,
            letterSpacing: "-0.01em",
            color: theme.foreground,
          }}
        >
          Contextly
        </span>
      )}
    </div>
  );
};