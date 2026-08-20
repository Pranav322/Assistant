"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function TenantIsolationDemo() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mt-4 flex flex-col gap-1.5">
      <motion.div
        className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
        animate={shouldReduceMotion ? { x: -6 } : { x: [-6, -6, 6, 6, -6] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: EASE,
          times: [0, 0.35, 0.5, 0.85, 1],
        }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <span className="text-[11px] text-muted-foreground">Tenant A</span>
      </motion.div>
      <motion.div
        className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
        animate={shouldReduceMotion ? { x: 6 } : { x: [6, 6, -6, -6, 6] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: EASE,
          times: [0, 0.35, 0.5, 0.85, 1],
        }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
        <span className="text-[11px] text-muted-foreground">Tenant B</span>
      </motion.div>
    </div>
  );
}
