"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/animated-section";
import { GradientCard } from "@/components/gradient-card";

const embedSnippet = `<script
  src="https://contextly.live/embed.js"
  data-api-key="ctly_xxxxxxxxxxxx"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  async
></script>`;

type Token = { text: string; cls: string };

function tokenize(code: string): Token[] {
  const parts = code.match(/<\/?|>|"[^"]*"|=|[\w-]+|\s+/g) ?? [];
  const tokens: Token[] = [];
  let afterAngle = false;
  for (const part of parts) {
    if (part === "<" || part === "</") {
      tokens.push({ text: part, cls: "text-zinc-500" });
      afterAngle = true;
    } else if (part === ">") {
      tokens.push({ text: part, cls: "text-zinc-500" });
      afterAngle = false;
    } else if (part === "=") {
      tokens.push({ text: part, cls: "text-zinc-500" });
    } else if (part.startsWith('"')) {
      tokens.push({ text: part, cls: "text-emerald-400" });
    } else if (/^\s+$/.test(part)) {
      tokens.push({ text: part, cls: "" });
    } else if (afterAngle) {
      tokens.push({ text: part, cls: "text-sky-400" });
      afterAngle = false;
    } else {
      tokens.push({ text: part, cls: "text-amber-300" });
    }
  }
  return tokens;
}

const tokens = tokenize(embedSnippet);
const totalLength = embedSnippet.length;

function renderTokens(charCount: number) {
  let consumed = 0;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length && consumed < charCount; i++) {
    const t = tokens[i];
    const remaining = charCount - consumed;
    const text = t.text.length <= remaining ? t.text : t.text.slice(0, remaining);
    out.push(
      <span key={i} className={t.cls}>
        {text}
      </span>
    );
    consumed += t.text.length;
  }
  return out;
}

export function CodeIntegration() {
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(shouldReduceMotion ? totalLength : 0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!hasPlayed || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setCharCount((n) => Math.min(n + 3, totalLength));
    }, 18);
    return () => clearInterval(interval);
  }, [hasPlayed, shouldReduceMotion]);

  const done = charCount >= totalLength;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="border-b py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <AnimatedSection direction="left">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Integration
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Add Contextly to your site in seconds
            </h2>
            <p className="mt-4 text-muted-foreground">
              Drop one script tag before the closing body tag. The widget
              fetches a short-lived token, loads the iframe, and starts
              answering questions from your indexed content.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "No build step required",
                "Works on any website or CMS",
                "Automatic token refresh before expiry",
                "Origin-validated for your domain",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </AnimatedSection>

          <AnimatedSection direction="right" delay={0.15}>
            <GradientCard hover={false} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">
                  embed.html
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <div
                ref={containerRef}
                className="relative overflow-x-auto bg-zinc-950 p-5 text-sm"
              >
                <pre className="font-mono leading-relaxed">
                  <code>
                    {renderTokens(charCount)}
                    {!shouldReduceMotion && !done && (
                      <span className="animate-pulse text-zinc-100">▍</span>
                    )}
                  </code>
                </pre>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/50" />
              </div>
            </GradientCard>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
