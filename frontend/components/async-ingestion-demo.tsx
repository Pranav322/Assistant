"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const JOBS = [
  { label: "invoice.pdf", delay: 0 },
  { label: "faq.md", delay: 0.6 },
  { label: "handbook.pdf", delay: 1.2 },
];

export function AsyncIngestionDemo() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mt-4 space-y-2">
      {JOBS.map((job) => (
        <div key={job.label} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-[11px] text-muted-foreground">
            {job.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
            <motion.div
              className="h-full rounded-full bg-primary/60"
              animate={
                shouldReduceMotion
                  ? { width: "60%" }
                  : { width: ["0%", "100%", "100%", "0%"] }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 2.8,
                      repeat: Infinity,
                      ease: EASE,
                      delay: job.delay,
                      times: [0, 0.6, 0.75, 1],
                    }
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
