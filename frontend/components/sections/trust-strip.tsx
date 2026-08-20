"use client";

import { MarqueeStrip } from "@/components/marquee-strip";

const technologies = [
  { name: "FastAPI", role: "API" },
  { name: "PostgreSQL + pgvector", role: "vector store" },
  { name: "Redis", role: "broker + cache" },
  { name: "Dramatiq", role: "async workers" },
  { name: "Azure OpenAI", role: "embeddings + LLM" },
  { name: "Docker", role: "self-host" },
  { name: "Prometheus", role: "metrics" },
  { name: "Next.js", role: "dashboard" },
];

function TechBadge({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
      <span className="h-2 w-2 rounded-full bg-primary/70" />
      {name}
      <span className="text-xs font-normal text-muted-foreground">
        {role}
      </span>
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="border-y bg-muted/30 py-8">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Open, portable, self-hostable
        </p>
        <MarqueeStrip speed="slow" pauseOnHover>
          {technologies.map((tech) => (
            <TechBadge key={tech.name} name={tech.name} role={tech.role} />
          ))}
        </MarqueeStrip>
      </div>
    </section>
  );
}
