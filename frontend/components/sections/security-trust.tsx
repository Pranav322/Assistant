"use client";

import { Shield, Lock, Fingerprint, Eye } from "lucide-react";
import { GradientCard } from "@/components/gradient-card";
import { AnimatedSection } from "@/components/animated-section";
import { StaggerContainer, StaggerItem } from "@/components/stagger-container";

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
    icon: Fingerprint,
    title: "Tenant isolation",
    description:
      "Every database query includes project_id. Combined with RLS, your data stays strictly separated.",
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
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Built safe by default
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Security is not a checkbox here. It shapes how we store keys, issue
            tokens, and isolate tenant data.
          </p>
        </AnimatedSection>

        <StaggerContainer
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.08}
        >
          {securityFeatures.map((feature) => (
            <StaggerItem key={feature.title}>
              <GradientCard className="h-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
    </section>
  );
}
