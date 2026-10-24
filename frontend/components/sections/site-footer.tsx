"use client";

import Link from "next/link";
import { WAITLIST_MODE, WAITLIST_PATH } from "@/lib/waitlist";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Docs", href: "/docs" },
    WAITLIST_MODE
      ? { label: "Join the waitlist", href: WAITLIST_PATH }
      : { label: "Dashboard", href: "/projects" },
  ],
  Resources: [
    { label: "Quickstart", href: "/docs/getting-started/quickstart" },
    { label: "Widget Guide", href: "/docs/platform/widget" },
    { label: "API Keys", href: "/docs/platform/api-keys" },
    { label: "Self-Hosting", href: "/docs/self-hosting" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="bg-background border-t py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
                C
              </div>
              <span className="text-sm font-semibold tracking-tight">Contextly</span>
            </Link>
            <p className="text-muted-foreground mt-4 max-w-xs text-sm">
              Production RAG chatbots for your platform. Ingest docs, embed a widget, and start
              answering questions in minutes.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold">{category}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Contextly Inc.</p>
          <p>Built for scale. Secure by default.</p>
        </div>
      </div>
    </footer>
  );
}
