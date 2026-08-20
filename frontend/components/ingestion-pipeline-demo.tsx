"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText, FileCode2, Link2 } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const CYCLE = 4.2;

const DOCS = [
  { icon: FileText, label: "guide.pdf", active: true },
  { icon: FileCode2, label: "faq.md", active: false },
  { icon: Link2, label: "docs.site/api", active: false },
];

const CHUNKS = [0, 1, 2, 3];
const GRID_SIZE = 12;

function chunkTiming(i: number) {
  const start = 0.08 + (i / CHUNKS.length) * 0.4;
  return { start, arrive: start + 0.22 };
}

function boxTiming(i: number) {
  const on = 0.2 + (i / (GRID_SIZE - 1)) * 0.55;
  return { on, off: 0.92 };
}

export function IngestionPipelineDemo() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full min-h-[220px] items-center gap-3 rounded-xl border bg-muted/20 p-4">
      {/* Source documents */}
      <div className="flex w-28 shrink-0 flex-col gap-2">
        {DOCS.map((doc) => (
          <div
            key={doc.label}
            className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5"
          >
            <doc.icon className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate text-[10px] text-muted-foreground">
              {doc.label}
            </span>
          </div>
        ))}
      </div>

      {/* Streaming chunk track */}
      <div className="relative h-16 flex-1">
        {CHUNKS.map((i) => {
          const { start, arrive } = chunkTiming(i);
          return (
            <motion.div
              key={i}
              className="absolute top-1/2 h-2 w-4 -translate-y-1/2 rounded-sm bg-primary/70"
              style={{ left: `${(i / CHUNKS.length) * 10}%` }}
              animate={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { left: ["0%", "0%", "100%", "100%"], opacity: [0, 1, 1, 0] }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: CYCLE,
                      repeat: Infinity,
                      ease: EASE,
                      times: [0, start, arrive, arrive + 0.03],
                    }
              }
            />
          );
        })}
      </div>

      {/* Vector store grid */}
      <div className="grid w-24 shrink-0 grid-cols-4 gap-1.5">
        {Array.from({ length: GRID_SIZE }).map((_, i) => {
          const { on, off } = boxTiming(i);
          return (
            <motion.div
              key={i}
              className="aspect-square rounded-sm bg-primary/15"
              animate={
                shouldReduceMotion
                  ? { opacity: 1, backgroundColor: "hsl(var(--primary) / 0.7)" }
                  : {
                      opacity: [0.25, 0.25, 1, 1, 0.25],
                      scale: [0.85, 0.85, 1, 1, 0.85],
                    }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: CYCLE,
                      repeat: Infinity,
                      ease: EASE,
                      times: [0, on, on + 0.04, off, 1],
                    }
              }
            />
          );
        })}
      </div>
    </div>
  );
}
