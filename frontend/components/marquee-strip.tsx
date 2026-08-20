"use client";

import { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MarqueeStripProps {
  children: ReactNode;
  className?: string;
  speed?: "slow" | "normal" | "fast";
  pauseOnHover?: boolean;
  direction?: "left" | "right";
}

export function MarqueeStrip({
  children,
  className = "",
  speed = "normal",
  pauseOnHover = true,
  direction = "left",
}: MarqueeStripProps) {
  const shouldReduceMotion = useReducedMotion();
  const speedClass = {
    slow: "[--duration:40s]",
    normal: "[--duration:25s]",
    fast: "[--duration:15s]",
  };

  const directionClass = direction === "left" ? "[--direction:-1]" : "[--direction:1]";

  return (
    <div
      className={cn(
        "group flex overflow-hidden",
        !shouldReduceMotion && speedClass[speed],
        !shouldReduceMotion && directionClass,
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-8 pr-8",
          !shouldReduceMotion && "animate-marquee",
          pauseOnHover && !shouldReduceMotion && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      {!shouldReduceMotion && (
        <div
          className={cn(
            "flex shrink-0 animate-marquee items-center gap-8 pr-8",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
          aria-hidden="true"
        >
          {children}
        </div>
      )}
    </div>
  );
}
