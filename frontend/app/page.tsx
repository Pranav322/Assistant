"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Layers, Search, Zap } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

export default function Home() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuth(isAuthenticated());
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-6 sm:px-8 lg:px-12">
          <div className="flex i
          tems-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Contextly
            </span>
          </div>
          <nav className="flex items-center gap-4">
            {isAuth === null ? (
              // Loading state or placeholder to prevent layout shift/flash
              <div className="w-20 h-9 bg-muted/20 animate-pulse rounded-md" />
            ) : isAuth ? (
              <Button asChild size="sm">
                <Link href="/projects">
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
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
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-muted/30" />
          <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 md:py-28 lg:px-12">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="text-left animate-slide-in-from-bottom">
                <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
                  Production Ready RAG Platform
                </Badge>
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:leading-[1.1]">
                  Ship intelligent assistants{" "}
                  <span className="text-primary">in minutes.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                  A complete toolkit for building retrieval-augmented generation apps.
                  Handles ingestion, retrieval, auth, and observability so you can
                  focus on the knowledge.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {isAuth === null ? (
                    <div className="flex gap-4">
                      <div className="h-12 w-40 bg-muted/20 animate-pulse rounded-md" />
                      <div className="h-12 w-32 bg-muted/20 animate-pulse rounded-md" />
                    </div>
                  ) : isAuth ? (
                    <Button size="lg" className="h-12 px-8 text-base" asChild>
                      <Link href="/projects">Go to Dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" className="h-12 px-8 text-base" asChild>
                        <Link href="/auth/register">Create Workspace</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                        <Link href="/auth/login">View Demo</Link>
                      </Button>
                    </>
                  )}
                </div>

                <div className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
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
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Secure by Default</span>
                  </div>
                </div>
              </div>

              <div className="relative animate-slide-in-from-top">
                <div className="rounded-3xl border bg-muted/40 p-6 shadow-sm">
                  <div className="rounded-2xl border bg-background p-6 shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Launch in 3 steps
                        </p>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight">
                          From data to assistant
                        </h3>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        10 min setup
                      </Badge>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Connect your sources</p>
                          <p className="text-sm text-muted-foreground">
                            Drag in docs or sync a URL. Chunking and embeddings included.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Search className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Tune retrieval</p>
                          <p className="text-sm text-muted-foreground">
                            Hybrid search and ranking ship with sensible defaults.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Share the widget</p>
                          <p className="text-sm text-muted-foreground">
                            Copy the embed snippet and go live in minutes.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border bg-muted/40 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Widget link generated automatically</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Insights and logs wired into your dashboard</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-lg border bg-background/80 p-3">
                    <p className="text-lg font-semibold text-foreground">99.9%</p>
                    <p>uptime</p>
                  </div>
                  <div className="rounded-lg border bg-background/80 p-3">
                    <p className="text-lg font-semibold text-foreground">30+ GB</p>
                    <p>indexed daily</p>
                  </div>
                  <div className="rounded-lg border bg-background/80 p-3">
                    <p className="text-lg font-semibold text-foreground">3 min</p>
                    <p>to first answer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-[0.35fr_0.65fr]">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Platform
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Everything you need for production RAG
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Reliable ingestion, search, and widget delivery with guardrails
                  that keep data safe and performance predictable.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-background p-6 shadow-sm">
                  <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Document Ingestion</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Upload PDFs, Markdown, or crawl URLs. We handle chunking, embedding, and storage automatically.
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-6 shadow-sm">
                  <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Semantic Search</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    High-performance vector retrieval tuned for accuracy, relevance, and context window limits.
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-6 shadow-sm">
                  <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Instant Integration</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Generate a pre-built chat widget with one click or use our API to build custom interfaces.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12">
            <div className="rounded-2xl border bg-background p-10 shadow-sm md:flex md:items-center md:justify-between">
              <div>
                <h3 className="text-3xl font-bold tracking-tight">Ready to build?</h3>
                <p className="mt-4 max-w-[520px] text-muted-foreground">
                  Join developers building the next generation of AI assistants with Contextly.
                </p>
              </div>
              <div className="mt-8 md:mt-0">
                <Button size="lg" asChild>
                  <Link href="/auth/register">Start for free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-6 px-6 text-sm text-muted-foreground sm:px-8 md:flex-row lg:px-12">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] text-primary-foreground font-bold">
              O
            </div>
            <span className="font-semibold text-foreground">Contextly</span>
          </div>
          <div className="flex gap-6">
            <p>&copy; {new Date().getFullYear()} Contextly Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
