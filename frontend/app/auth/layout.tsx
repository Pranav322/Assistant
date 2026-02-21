import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                C
              </div>
              <span className="text-sm font-semibold tracking-tight">
                Contextly
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Docs
            </Link>
            <Button asChild size="sm">
              <Link href="/auth/login">
                Sign in
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-muted/40 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-12 px-4 py-8 sm:px-8 sm:py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                C
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Contextly
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Build production-grade AI assistants.
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Sign in to manage your RAG projects, monitor usage, and deploy widgets
              with confidence.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-background/80 p-4 shadow-sm"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary">SOC-ready logging</Badge>
              <Badge variant="secondary">Hybrid retrieval</Badge>
              <Badge variant="secondary">Widget protocol</Badge>
            </div>
          </div>

          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
