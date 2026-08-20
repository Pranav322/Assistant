"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, MessageSquare, Sparkles } from "lucide-react";
import { AnimatedSection } from "@/components/animated-section";

const steps = [
  {
    icon: Upload,
    title: "Upload your content",
    description:
      "Drop in PDFs, paste a URL, or add Markdown. We accept the formats your docs already live in.",
  },
  {
    icon: Cpu,
    title: "Chunk & embed",
    description:
      "Content is split into context-aware chunks and converted into embeddings by Azure OpenAI, stored in pgvector.",
  },
  {
    icon: MessageSquare,
    title: "Users ask questions",
    description:
      "Your visitors chat through the embedded widget or your own API integration. Every request is tenant-scoped.",
  },
  {
    icon: Sparkles,
    title: "Get grounded answers",
    description:
      "The model answers from retrieved chunks with inline citations, reducing hallucinations and building trust.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b bg-muted/20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-12 text-center sm:mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            From docs to live chatbot in four steps
          </h2>
        </AnimatedSection>

        <div className="relative">
          <div className="absolute left-4 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:left-1/2 md:block" />

          <div className="space-y-8 md:space-y-16">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
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
