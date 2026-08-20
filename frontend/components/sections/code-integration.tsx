"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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

export function CodeIntegration() {
  const [copied, setCopied] = useState(false);

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
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
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
              <div className="relative overflow-x-auto bg-zinc-950 p-5 text-sm">
                <motion.pre
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="font-mono leading-relaxed text-zinc-100"
                >
                  <code>{embedSnippet}</code>
                </motion.pre>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/50" />
              </div>
            </GradientCard>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
