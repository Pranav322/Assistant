"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopyBlock from "@/components/CopyBlock";
import { CheckCircle2, Layers, Search, Zap, Shield, BarChart3, Code, Package } from "lucide-react";
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
          <div className="flex items-center gap-2">
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
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="text-left animate-slide-in-from-bottom lg:mt-12">
                <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
                  The Chatbot for Your Platform
                </Badge>
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:leading-[1.1]">
                  Ship intelligent assistants{" "}
                  <span className="text-primary">in minutes.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                  A complete toolkit for building retrieval-augmented generation apps.
                  You can use this chatbot directly in your existing app without any issue.
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
                  <div className="rounded-2xl border bg-background p-6 shadow-lg h-[550px] flex flex-col">
                    <Tabs defaultValue="widget" className="w-full flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="widget">
                            <Code className="mr-2 h-4 w-4" />
                            Script Tag
                          </TabsTrigger>
                          <TabsTrigger value="package">
                            <Package className="mr-2 h-4 w-4" />
                            React Package
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="widget" className="space-y-4">
                        <div className="rounded-lg border bg-muted/50 p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium">Embed with one line</h4>
                            <Badge variant="outline" className="text-xs">HTML / Any Framework</Badge>
                          </div>
                          <CopyBlock value={`<script 
  src="https://www.contextly.live/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-api-base-url="https://api.contextly.live/api/v1"
  defer
></script>`} />
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Auto-updates with new features</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Zero configuration required</span>
                          </li>
                        </ul>
                      </TabsContent>

                      <TabsContent value="package" className="space-y-4">
                        <div className="rounded-lg border bg-muted/50 p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium">Full React Integration</h4>
                            <Badge variant="outline" className="text-xs">npm / pnpm</Badge>
                          </div>
                          <div className="mb-4">
                            <CopyBlock value="npm install contextly" />
                          </div>
                          <CopyBlock value={`import { Chat } from "contextly";

export default function App() {
  return (
    <Chat 
      projectId="YOUR_PROJECT_ID"
      token="YOUR_WIDGET_TOKEN"
    />
  );
}`} />
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Headless hooks for custom UI</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>TypeScript support included</span>
                          </li>
                        </ul>
                      </TabsContent>
                    </Tabs>
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
                  Integration
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Seamlessly integrate AI chat into your product
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Drop our pre-built widget into your frontend or use the API for full control.
                  We handle the complexity of RAG so you can focus on your users.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border bg-background p-6 shadow-sm">
                  <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Document Ingestion</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Upload PDFs, Markdown, or simply paste your website URL to instantly train the chatbot on your specific knowledge base.
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
                  <h3 className="text-lg font-semibold tracking-tight">Embeddable Widget & SDK</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Use our pre-built widget or the <code className="text-xs bg-muted px-1 py-0.5 rounded">contextly</code> npm package for React apps. Full control, zero config.
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-6 shadow-sm">
                  <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3 text-primary">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Secure by Default</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Enterprise-grade auth with API keys, rate limiting, and tenant isolation built in.
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
