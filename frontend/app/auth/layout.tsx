import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Authentication",
  robots: {
    index: false,
    follow: false,
  },
};

const highlights = [
  {
    title: "Secure by default",
    description: "Origin validation, API key auth, and tenant isolation.",
    icon: ShieldCheck,
  },
  {
    title: "Fast setup",
    description: "Ingest documents and go live in minutes.",
    icon: Sparkles,
  },
  {
    title: "Production ready",
    description: "Monitoring, rate limits, and audit trails built in.",
    icon: CheckCircle2,
  },
  {
    title: "Instant widget",
    description: "Copy-paste embed code and start chatting in minutes.",
    icon: Zap,
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
                C
              </div>
              <span className="text-sm font-semibold tracking-tight">Contextly</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              Docs
            </Link>
            <Button asChild size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="relative min-h-screen overflow-hidden">
        <div className="bg-primary/10 absolute top-20 -left-40 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-muted/40 absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-12 px-4 py-8 sm:px-8 sm:py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold">
                C
              </div>
              <div>
                <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">
                  Contextly
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Build production-grade AI assistants.
                </h1>
              </div>
            </div>

            <p className="text-muted-foreground max-w-xl text-base sm:text-lg">
              Sign in to manage your RAG projects, monitor usage, and deploy widgets with
              confidence.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.title} className="bg-background/80 rounded-2xl border p-4 shadow-sm">
                  <item.icon className="text-primary h-5 w-5" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">SOC-ready logging</Badge>
              <Badge variant="secondary">Hybrid retrieval</Badge>
              <Badge variant="secondary">Widget protocol</Badge>
            </div>
          </div>

          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
