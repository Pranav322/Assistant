import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Layers, Search, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              O
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Orizn RAG
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/auth/register">
                Get Started
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container max-w-5xl px-6 py-24 md:py-32 text-center animate-fade-in">
          <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
            Production Ready RAG Platform
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:leading-[1.1]">
            Ship intelligent assistants{" "}
            <span className="text-primary block sm:inline">in minutes.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            A complete toolkit for building retrieval-augmented generation apps.
            Handles ingestion, retrieval, auth, and observability so you can
            focus on the knowledge.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/auth/register">Create Workspace</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/auth/login">View Demo</Link>
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Instant Embedding</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Widget Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Production Scale</span>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="container max-w-5xl px-6 py-24">
            <div className="grid gap-12 sm:grid-cols-3">
              <div className="space-y-4">
                <div className="mb-2 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">Document Ingestion</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Upload PDFs, Markdown, or crawl URLs. We handle chunking, embedding, and storage automatically.
                </p>
              </div>
              <div className="space-y-4">
                <div className="mb-2 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">Semantic Search</h3>
                <p className="text-muted-foreground leading-relaxed">
                  High-performance vector retrieval tuned for accuracy, relevance, and context window limits.
                </p>
              </div>
              <div className="space-y-4">
                <div className="mb-2 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">Instant Integration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Generate a pre-built chat widget with one click or use our API to build custom interfaces.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container max-w-5xl px-6 py-24 text-center">
          <div className="rounded-2xl border bg-background p-12 shadow-sm">
            <h3 className="text-3xl font-bold tracking-tight">
              Ready to build?
            </h3>
            <p className="mx-auto mt-4 max-w-[600px] text-muted-foreground">
              Join developers building the next generation of AI assistants with Orizn.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/auth/register">Start for free</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] text-primary-foreground font-bold">
              O
            </div>
            <span className="font-semibold text-foreground">Orizn RAG</span>
          </div>
          <div className="flex gap-6">
            <p>&copy; {new Date().getFullYear()} Orizn Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
