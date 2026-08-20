"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, FileText } from "lucide-react";

type ScriptStep =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; citations?: string[] };

const SCRIPT: ScriptStep[] = [
  {
    role: "assistant",
    text: "Hi! I'm your docs assistant. Ask me anything about your product, policies, or account.",
  },
  { role: "user", text: "What are your refund terms?" },
  {
    role: "assistant",
    text: "Refunds are available within 30 days of purchase, no questions asked. After that, we offer prorated credit for annual plans.",
    citations: ["refund-policy.md", "billing.md"],
  },
  {
    role: "assistant",
    text: "Want me to walk you through how the annual-plan proration is calculated?",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function MiniChatDemo() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasPlayed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasPlayed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasPlayed]);

  useEffect(() => {
    if (!hasPlayed) return;

    if (shouldReduceMotion) {
      setVisibleSteps(SCRIPT.length);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = async () => {
      for (let i = 0; i < SCRIPT.length; i++) {
        if (cancelled) return;
        await new Promise((r) => timers.push(setTimeout(r, i === 0 ? 400 : 700)));
        if (cancelled) return;
        if (SCRIPT[i].role === "assistant") {
          setTyping(true);
          await new Promise((r) => timers.push(setTimeout(r, 900)));
          if (cancelled) return;
          setTyping(false);
        }
        setVisibleSteps((n) => n + 1);
      }
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [hasPlayed, shouldReduceMotion]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[320px] flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
    >
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Assistant · online
        </span>
      </div>

      <div className="min-h-0 flex-1 flex flex-col gap-3 overflow-y-auto p-4">
        <AnimatePresence>
          {SCRIPT.slice(0, visibleSteps).map((step, i) => (
            <motion.div
              key={i}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className={
                step.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                  : "mr-auto max-w-[95%] rounded-2xl rounded-bl-sm border bg-muted/40 px-3.5 py-2 text-sm text-foreground"
              }
            >
              {step.text}
              {step.role === "assistant" && step.citations && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {step.citations.map((citation) => (
                    <span
                      key={citation}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      <FileText className="h-3 w-3" />
                      {citation}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {typing && (
          <div className="mr-auto flex items-center gap-1 rounded-2xl rounded-bl-sm border bg-muted/40 px-3.5 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}

        <div
          aria-hidden="true"
          className="mt-auto flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2"
        >
          <input
            disabled
            aria-hidden="true"
            tabIndex={-1}
            placeholder="Ask anything about your docs…"
            className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            disabled
            aria-hidden="true"
            tabIndex={-1}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/60 text-primary-foreground"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
