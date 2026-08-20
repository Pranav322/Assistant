"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  highlight?: boolean;
}

export function GradientCard({
  children,
  className = "",
  hover = true,
  highlight = false,
}: GradientCardProps) {
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
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
