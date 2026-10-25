"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { authHref, authLabel } from "@/lib/waitlist";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b py-16 sm:py-24 lg:py-32">
      <div className="bg-muted/30 absolute inset-0 -z-10" />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="absolute inset-0 -z-10"
      >
        <div className="bg-primary/5 absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute top-1/4 right-1/4 h-64 w-64 rounded-full blur-3xl" />
      </motion.div>

      <div className="relative z-10 mx-auto w-full max-w-[900px] px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Ready to ship your AI assistant?
          </h2>
          <p className="text-muted-foreground mx-auto mt-6 max-w-lg text-lg">
            Join teams building the next generation of customer-facing support and documentation
            chatbots.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="group w-full sm:w-auto" asChild>
              <Link href={authHref("/auth/register")}>
                {authLabel("Start for free")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/docs/getting-started">Read the docs</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
