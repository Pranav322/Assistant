"use client";

import { AnimatedCounter } from "@/components/animated-counter";
import { AnimatedSection } from "@/components/animated-section";

const stats = [
  { value: 99.9, suffix: "%", label: "API availability target" },
  { value: 2, suffix: "s", label: "P95 chat latency target", prefix: "<" },
  { value: 500, suffix: "ms", label: "P95 search latency target", prefix: "<" },
  { value: 24, suffix: "h", label: "Widget token TTL" },
];

export function StatsStrip() {
  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center"
              >
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  decimals={stat.value % 1 !== 0 ? 1 : 0}
                  className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
