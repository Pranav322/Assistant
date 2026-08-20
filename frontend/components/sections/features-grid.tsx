"use client";

import {
  FileText,
  Search,
  Bot,
  ShieldCheck,
  Workflow,
  LineChart,
} from "lucide-react";
import { GradientCard } from "@/components/gradient-card";
import { StaggerContainer, StaggerItem } from "@/components/stagger-container";
import { AnimatedSection } from "@/components/animated-section";

const features = [
  {
    icon: FileText,
    title: "Document Ingestion",
    description:
      "Upload PDFs, Markdown, or paste a URL. Contextly chunks, embeds, and indexes your content with Azure OpenAI embeddings.",
    span: "md:col-span-1",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description:
      "High-performance vector retrieval over pgvector HNSW indexes, tuned for relevance and context-window limits.",
    span: "md:col-span-1",
  },
  {
    icon: Bot,
    title: "Embeddable Widget",
    description:
      "One script tag drops a secure chat widget onto any site. Iframe isolation keeps customer data where it belongs.",
    span: "md:col-span-1",
  },
  {
    icon: ShieldCheck,
    title: "Tenant Isolation",
    description:
      "Every database query is scoped to a project_id, with Row-Level Security as defense-in-depth. Your data never leaks across tenants.",
    span: "md:col-span-1",
  },
  {
    icon: Workflow,
    title: "Async Ingestion",
    description:
      "Heavy processing is offloaded to Dramatiq workers via Redis, so uploads never block your API or dashboard.",
    span: "md:col-span-1",
  },
  {
    icon: LineChart,
    title: "Observability",
    description:
      "Structured JSON logs, Prometheus metrics, and real-user widget telemetry give you full visibility into performance and usage.",
    span: "md:col-span-1",
  },
];

export function FeaturesGrid() {
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

        <StaggerContainer
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.08}
        >
          {features.map((feature) => (
            <StaggerItem key={feature.title} className={feature.span}>
              <GradientCard className="h-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </GradientCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
