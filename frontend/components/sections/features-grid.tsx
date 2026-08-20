"use client";

import {
  FileText,
  Search,
  Bot,
  ShieldCheck,
  Workflow,
  LineChart,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GradientCard } from "@/components/gradient-card";
import { StaggerContainer, StaggerItem } from "@/components/stagger-container";
import { AnimatedSection } from "@/components/animated-section";
import { MiniChatDemo } from "@/components/mini-chat-demo";
import { IngestionPipelineDemo } from "@/components/ingestion-pipeline-demo";
import { SemanticSearchDemo } from "@/components/semantic-search-demo";
import { TenantIsolationDemo } from "@/components/tenant-isolation-demo";
import { AsyncIngestionDemo } from "@/components/async-ingestion-demo";
import { ObservabilityDemo } from "@/components/observability-demo";

const EASE = [0.16, 1, 0.3, 1] as const;

const restDemos = [
  SemanticSearchDemo,
  TenantIsolationDemo,
  AsyncIngestionDemo,
  ObservabilityDemo,
];

const heroFeature = {
  icon: FileText,
  title: "Document Ingestion",
  description:
    "Upload PDFs, Markdown, or paste a URL — Contextly chunks, embeds, and indexes it with Azure OpenAI embeddings.",
};

const widgetFeature = {
  icon: Bot,
  title: "Embeddable Widget",
  description:
    "One script tag drops a secure chat widget onto any site. Iframe isolation keeps customer data where it belongs.",
};

const restFeatures = [
  {
    icon: Search,
    title: "Semantic Search",
    description:
      "High-performance vector retrieval over pgvector HNSW indexes, tuned for relevance and context-window limits.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant Isolation",
    description:
      "Every database query is scoped to a project_id, with Row-Level Security as defense-in-depth. Your data never leaks across tenants.",
  },
  {
    icon: Workflow,
    title: "Async Ingestion",
    description:
      "Heavy processing is offloaded to Dramatiq workers via Redis, so uploads never block your API or dashboard.",
  },
  {
    icon: LineChart,
    title: "Observability",
    description:
      "Structured JSON logs, Prometheus metrics, and real-user widget telemetry give you full visibility into performance and usage.",
  },
];

export function FeaturesGrid() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="border-b py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-12 text-center sm:mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Capabilities
          </p>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to ship a production RAG chatbot
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            No infrastructure to manage. We handle ingestion, retrieval, auth,
            and monitoring so you can focus on your users.
          </p>
        </AnimatedSection>

        <div className="grid gap-4">
          {/* Hero card */}
          <AnimatedSection>
            <div className="group relative overflow-hidden rounded-2xl border bg-background p-8 shadow-sm sm:p-10">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                <div
                  className="absolute inset-0 opacity-[0.15]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                {!shouldReduceMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 30%, hsl(var(--primary) / 0.25) 50%, transparent 70%)",
                      backgroundSize: "200% 200%",
                    }}
                    animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear",
                      repeatType: "mirror",
                    }}
                  />
                )}
              </div>

              <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <motion.div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    animate={
                      shouldReduceMotion ? undefined : { y: [0, -4, 0] }
                    }
                    transition={{ duration: 3, repeat: Infinity, ease: EASE }}
                  >
                    <heroFeature.icon className="h-6 w-6" />
                  </motion.div>
                  <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {heroFeature.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {heroFeature.description}
                  </p>
                </div>
                <IngestionPipelineDemo />
              </div>
            </div>
          </AnimatedSection>

          {/* Widget demo + supporting features */}
          <StaggerContainer
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.08}
          >
            <StaggerItem className="sm:col-span-2">
              <GradientCard className="h-full" hover={false}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex h-full flex-col justify-center">
                    <motion.div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      animate={shouldReduceMotion ? undefined : { y: [0, -3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: EASE }}
                    >
                      <widgetFeature.icon className="h-6 w-6" />
                    </motion.div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {widgetFeature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {widgetFeature.description}
                    </p>
                  </div>
                  <MiniChatDemo />
                </div>
              </GradientCard>
            </StaggerItem>

            {restFeatures.map((feature, i) => {
              const Demo = restDemos[i];
              return (
                <StaggerItem
                  key={feature.title}
                  className={i === 0 ? "sm:col-span-2 lg:col-span-1" : undefined}
                >
                  <GradientCard className="h-full" ambientGlow>
                    <motion.div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      animate={
                        shouldReduceMotion ? undefined : { y: [0, -3, 0] }
                      }
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: EASE,
                        delay: i * 0.2,
                      }}
                    >
                      <feature.icon className="h-6 w-6" />
                    </motion.div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    <Demo />
                  </GradientCard>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
