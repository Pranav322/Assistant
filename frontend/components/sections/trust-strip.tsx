"use client";

import { MarqueeStrip } from "@/components/marquee-strip";

const technologies = [
  "FastAPI",
  "PostgreSQL + pgvector",
  "Redis",
  "Dramatiq",
  "Azure OpenAI",
  "Docker",
  "Prometheus",
  "Next.js",
];

function TechBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
      <span className="h-2 w-2 rounded-full bg-primary/70" />
      {name}
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="border-y bg-muted/30 py-8">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Built on the same stack that powers high-scale teams
        </p>
        <MarqueeStrip speed="slow" pauseOnHover>
          {technologies.map((tech) => (
            <TechBadge key={tech} name={tech} />
          ))}
        </MarqueeStrip>
      </div>
    </section>
  );
}
