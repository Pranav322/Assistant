"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload, Cpu, MessageSquare, Sparkles, Check, FileText } from "lucide-react";
import { AnimatedSection } from "@/components/animated-section";

const EASE = [0.16, 1, 0.3, 1] as const;

function UploadVisual({ reduced }: { reduced: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-muted-foreground">docs.pdf</span>
      <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={reduced ? { width: "100%" } : { width: "0%" }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.9, ease: EASE }}
        />
      </div>
    </div>
  );
}

function ChunkVisual({ reduced }: { reduced: boolean }) {
  const chips = ["chunk 1", "chunk 2", "chunk 3"];
  return (
    <div className="mt-4 flex items-center gap-1.5">
      {chips.map((chip, i) => (
        <motion.span
          key={chip}
          initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.2 + i * 0.15, ease: EASE }}
          className="rounded-md border bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary"
        >
          {chip}
        </motion.span>
      ))}
    </div>
  );
}

function ChatVisual({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.2, ease: EASE }}
      className="mt-4 inline-flex max-w-[220px] items-center rounded-2xl rounded-bl-sm border bg-background px-3 py-2 text-xs text-foreground"
    >
      &ldquo;What are your refund terms?&rdquo;
    </motion.div>
  );
}

function AnswerVisual({ reduced }: { reduced: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <motion.span
        initial={reduced ? { scale: 1 } : { scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="h-3 w-3" />
      </motion.span>
      <motion.span
        initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.25, ease: EASE }}
        className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[10px] text-muted-foreground"
      >
        <FileText className="h-3 w-3" />
        refund-policy.md
      </motion.span>
    </div>
  );
}

const steps = [
  {
    icon: Upload,
    title: "Upload your content",
    description:
      "Drop in PDFs, paste a URL, or add Markdown. We accept the formats your docs already live in.",
    visual: UploadVisual,
  },
  {
    icon: Cpu,
    title: "Chunk & embed",
    description:
      "Content is split into context-aware chunks and converted into embeddings by Azure OpenAI, stored in pgvector.",
    visual: ChunkVisual,
  },
  {
    icon: MessageSquare,
    title: "Users ask questions",
    description:
      "Your visitors chat through the embedded widget or your own API integration. Every request is tenant-scoped.",
    visual: ChatVisual,
  },
  {
    icon: Sparkles,
    title: "Get grounded answers",
    description:
      "The model answers from retrieved chunks with inline citations, reducing hallucinations and building trust.",
    visual: AnswerVisual,
  },
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();
  const timelineRef = useRef<HTMLDivElement>(null);

  return (
    <section className="border-b bg-muted/20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-12 text-center sm:mb-16">
          <span className="mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            How it works
          </span>
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            From docs to live chatbot in four steps
          </h2>
        </AnimatedSection>

        <div ref={timelineRef} className="relative">
          <div className="absolute left-4 top-8 hidden h-[calc(100%-4rem)] w-px bg-muted md:left-1/2 md:block" />
          <motion.div
            initial={{ scaleY: shouldReduceMotion ? 1 : 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: shouldReduceMotion ? 0 : 1.4, ease: EASE }}
            style={{ transformOrigin: "top" }}
            className="absolute left-4 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:left-1/2 md:block"
          />

          <div className="space-y-8 md:space-y-16">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              const Visual = step.visual;
              return (
                <AnimatedSection
                  key={step.title}
                  direction={isEven ? "left" : "right"}
                  delay={index * 0.1}
                >
                  <div
                    className={`relative flex flex-col gap-6 md:flex-row md:items-center ${
                      isEven ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex-1" />

                    <motion.div
                      whileInView={{ scale: [0.8, 1.1, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-background text-primary shadow-md md:h-14 md:w-14"
                    >
                      {!shouldReduceMotion && (
                        <motion.span
                          initial={{ opacity: 0.6, scale: 1 }}
                          whileInView={{ opacity: 0, scale: 1.6 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: EASE }}
                          className="absolute inset-0 rounded-full bg-primary/40"
                        />
                      )}
                      <motion.span
                        aria-hidden="true"
                        animate={shouldReduceMotion ? undefined : { opacity: [0.5, 0.9, 0.5] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 + 1 }}
                        className="absolute inset-0 rounded-full shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                      />
                      <step.icon className="h-5 w-5 md:h-6 md:w-6" />
                    </motion.div>

                    <div
                      className={`flex-1 ${
                        isEven ? "md:text-right" : "md:text-left"
                      }`}
                    >
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          Step {index + 1}
                        </span>
                      </div>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                        {step.description}
                      </p>
                      <div className={isEven ? "md:flex md:justify-end" : ""}>
                        <Visual reduced={!!shouldReduceMotion} />
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
