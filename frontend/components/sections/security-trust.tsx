"use client";

import { Shield, Lock, Fingerprint, Eye } from "lucide-react";
import { GradientCard } from "@/components/gradient-card";
import { AnimatedSection } from "@/components/animated-section";
import { StaggerContainer, StaggerItem } from "@/components/stagger-container";

const leadFeature = {
  icon: Fingerprint,
  title: "Tenant isolation",
  description:
    "Every database query includes project_id. Combined with Row-Level Security, your data stays strictly separated — no cross-tenant leakage, ever.",
};

const securityFeatures = [
  {
    icon: Lock,
    title: "bcrypt API keys",
    description:
      "API keys are hashed with bcrypt, never SHA-256. They resist GPU cracking and are easy to rotate or revoke.",
  },
  {
    icon: Shield,
    title: "JWT widget tokens",
    description:
      "Short-lived tokens validated for signature, expiry, issuer, audience, and origin on every request.",
  },
  {
    icon: Eye,
    title: "No wildcard postMessage",
    description:
      "Widget and parent communicate with explicit targetOrigin. No open wildcards, ever.",
  },
];

export function SecurityTrust() {
  return (
    <section className="border-b bg-muted/20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-12 text-center sm:mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Security
          </p>
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Built safe by default
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Security is not a checkbox here. It shapes how we store keys, issue
            tokens, and isolate tenant data.
          </p>
        </AnimatedSection>

        <div className="grid gap-4">
          <AnimatedSection>
            <div className="relative overflow-hidden rounded-2xl border bg-background p-8 shadow-sm sm:p-10">
              <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <leadFeature.icon className="h-7 w-7" />
                </div>
                <div className="max-w-xl">
                  <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {leadFeature.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {leadFeature.description}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-6 font-mono text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">
                  WHERE project_id = $1
                </span>
                <span className="text-muted-foreground/50">+</span>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
                  ROW LEVEL SECURITY
                </span>
              </div>
            </div>
          </AnimatedSection>

          <StaggerContainer
            className="grid gap-4 sm:grid-cols-3"
            staggerDelay={0.08}
          >
            {securityFeatures.map((feature) => (
              <StaggerItem key={feature.title}>
                <GradientCard className="h-full">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">
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
      </div>
    </section>
  );
}
