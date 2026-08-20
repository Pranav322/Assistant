"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  highlight?: boolean;
  ambientGlow?: boolean;
}

export function GradientCard({
  children,
  className = "",
  hover = true,
  highlight = false,
  ambientGlow = false,
}: GradientCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -4,
              transition: { duration: 0.25, ease: "easeOut" },
            }
          : undefined
      }
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-sm",
        highlight && "border-primary/30 shadow-md",
        className
      )}
    >
      {hover && (
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/20" />
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        </div>
      )}
      {ambientGlow && (
        <motion.div
          className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          animate={shouldReduceMotion ? { opacity: 0.5 } : { opacity: [0.25, 0.55, 0.25] }}
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 4, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }
          }
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
