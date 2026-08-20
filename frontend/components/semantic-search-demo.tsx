"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";

const QUERIES = ["refund policy", "pricing tiers", "reset password"];
const EASE = [0.16, 1, 0.3, 1] as const;
const BARS = [0.9, 0.6, 0.75, 0.45, 0.55];

export function SemanticSearchDemo() {
  const shouldReduceMotion = useReducedMotion();
  const [queryIndex, setQueryIndex] = useState(0);
  const [charCount, setCharCount] = useState(
    shouldReduceMotion ? QUERIES[0].length : 0
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const query = QUERIES[queryIndex];
    const delay = deleting ? 40 : charCount === query.length ? 1200 : 70;

    const timer = setTimeout(() => {
      if (!deleting) {
        if (charCount < query.length) {
          setCharCount((c) => c + 1);
        } else {
          setDeleting(true);
        }
      } else {
        if (charCount > 0) {
          setCharCount((c) => c - 1);
        } else {
          setDeleting(false);
          setQueryIndex((i) => (i + 1) % QUERIES.length);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [charCount, deleting, queryIndex, shouldReduceMotion]);

  const text = QUERIES[queryIndex].slice(0, charCount);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="truncate">
          {text}
          {!shouldReduceMotion && (
            <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-primary/60 align-middle" />
          )}
        </span>
      </div>
      <div className="flex h-10 items-end gap-1.5">
        {BARS.map((base, i) => (
          <motion.div
            key={i}
            className="w-full rounded-sm bg-primary/50"
            style={{ height: `${base * 100}%` }}
            animate={
              shouldReduceMotion
                ? undefined
                : { opacity: [0.5, 1, 0.5], scaleY: [0.8, 1, 0.8] }
            }
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: EASE,
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </div>
  );
}
