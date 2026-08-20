"use client";

import { ShieldCheck, KeyRound, Lock, Activity } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedSection } from "@/components/animated-section";
import { StaggerContainer, StaggerItem } from "@/components/stagger-container";

const EASE = [0.16, 1, 0.3, 1] as const;

const guarantees = [
  {
    icon: ShieldCheck,
    title: "Row-level security on every query",
    detail: "project_id scoping enforced in-app and by PostgreSQL RLS.",
  },
  {
    icon: KeyRound,
    title: "Short-lived widget tokens",
    detail: "24h signed JWTs, origin-validated, auto-refreshed.",
  },
  {
    icon: Lock,
    title: "bcrypt-hashed API keys",
    detail: "Keys are never stored or logged in plaintext.",
  },
  {
    icon: Activity,
    title: "Observability out of the box",
    detail: "Structured JSON logs, Prometheus metrics, widget telemetry.",
  },
];

export function StatsStrip() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-10 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Guarantees
          </p>
          <h2 className="font-display mx-auto max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            What holds true from day one
          </h2>
        </AnimatedSection>

        <StaggerContainer
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.08}
        >
          {guarantees.map((item, i) => (
            <StaggerItem key={item.title}>
              <div className="group flex flex-col items-center rounded-2xl p-4 text-center transition-colors hover:bg-muted/40">
                <motion.div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-shadow group-hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
                  animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: EASE,
                    delay: i * 0.2,
                  }}
                >
                  <item.icon className="h-6 w-6" />
                </motion.div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
