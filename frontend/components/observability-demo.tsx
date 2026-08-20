"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const PATH = "M2,32 L18,26 L34,30 L50,16 L66,20 L82,6 L98,10";
const POINTS: [number, number][] = [
  [2, 32],
  [18, 26],
  [34, 30],
  [50, 16],
  [66, 20],
  [82, 6],
  [98, 10],
];

export function ObservabilityDemo() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 100 40" className="mt-4 h-12 w-full overflow-visible">
      <motion.path
        d={PATH}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={shouldReduceMotion ? { pathLength: 1 } : { pathLength: [0, 1] }}
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 2.4, repeat: Infinity, ease: EASE, repeatDelay: 0.6 }
        }
      />
      {!shouldReduceMotion && (
        <motion.circle
          r="2"
          fill="hsl(var(--primary))"
          style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
          animate={{
            cx: POINTS.map((p) => p[0]),
            cy: POINTS.map((p) => p[1]),
            opacity: [0, 1, 1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: EASE,
            repeatDelay: 0.6,
          }}
        />
      )}
    </svg>
  );
}
