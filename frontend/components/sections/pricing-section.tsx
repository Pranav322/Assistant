"use client";

import { PricingTiers } from "@/components/pricing-tiers";
import { AnimatedSection } from "@/components/animated-section";

export function PricingSection() {
  return (
    <section id="pricing" className="border-b py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-12 text-center sm:mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free, scale with confidence
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Generous free tier for side projects. Pro when you need more
            projects, higher token limits, and priority support.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <PricingTiers />
        </AnimatedSection>
      </div>
    </section>
  );
}
