"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopyBlock from "@/components/CopyBlock";
import { CheckCircle2, Layers, Search, Zap, Shield, BarChart3, Code, Package, Sparkles } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

export default function Home() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuth(isAuthenticated());
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10 overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Contextly
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Pricing
            </Link>
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
                  className="hidden sm:inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
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
          <div className="absolute inset-y-0 right-0 -z-10 w-full lg:w-1/2 bg-muted/30" />
          <div className="absolute right-0 top-0 -z-10 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-primary/10 blur-3xl opacity-50 sm:opacity-100" />
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
            <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
              <div className="text-left animate-slide-in-from-bottom lg:mt-12">
                <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
                  The Chatbot for Your Platform
                </Badge>
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:leading-[1.1] text-balance">
                  Ship intelligent assistants{" "}
                  <span className="text-primary block sm:inline">in minutes.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl leading-relaxed text-balance">
                  A complete toolkit for building retrieval-augmented generation apps.
                  You can use this chatbot directly in your existing app without any issue.
                  Handles ingestion, retrieval, auth, and observability.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {isAuth === null ? (
                    <div className="flex gap-4">
                      <div className="h-12 w-40 bg-muted/20 animate-pulse rounded-md" />
                      <div className="h-12 w-32 bg-muted/20 animate-pulse rounded-md" />
                    </div>
                  ) : isAuth ? (
                    <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base" asChild>
                      <Link href="/projects">Go to Dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base" asChild>
                        <Link href="/auth/register">Create Workspace</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto px-8 text-base" asChild>
                        <Link href="/auth/login">View Demo</Link>
                      </Button>
                    </>
                  )}
                </div>

                <div className="mt-10 grid gap-3 text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Instant Embedding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Widget Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Production Scale</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Secure by Default</span>
                  </div>
                </div>
              </div>

              <div className="relative animate-slide-in-from-top mt-8 lg:mt-0 w-full min-w-0">
                <div className="rounded-3xl border bg-muted/40 p-4 sm:p-6 shadow-sm overflow-hidden">
                  <div className="rounded-2xl border bg-background p-4 sm:p-6 shadow-lg h-[500px] sm:h-[550px] flex flex-col w-full">
                    <Tabs defaultValue="widget" className="w-full flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="widget">
                            <Code className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Script Tag</span>
                            <span className="sm:hidden">Script</span>
                          </TabsTrigger>
                          <TabsTrigger value="package">
                            <Package className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">React Package</span>
                            <span className="sm:hidden">React</span>
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="widget" className="space-y-4 flex-1 overflow-auto">
                        <div className="rounded-lg border bg-muted/50 p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                            <h4 className="text-sm font-medium">Embed with one line</h4>
                            <Badge variant="outline" className="text-xs w-fit">HTML / Any Framework</Badge>
                          </div>
                          <div className="overflow-x-auto max-w-full">
                            <CopyBlock value={`<script 
  src="https://www.contextly.live/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-api-base-url="https://api.contextly.live/api/v1"
  defer
></script>`} />
                          </div>
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

                      <TabsContent value="package" className="space-y-4 flex-1 overflow-auto">
                        <div className="rounded-lg border bg-muted/50 p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                            <h4 className="text-sm font-medium">Full React Integration</h4>
                            <Badge variant="outline" className="text-xs w-fit">npm / pnpm</Badge>
                          </div>
                          <div className="mb-4">
                            <CopyBlock value="npm install contextly" />
                          </div>
                          <div className="overflow-x-auto max-w-full">
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
                  <div className="rounded-lg border bg-background/80 p-3 col-span-2 sm:col-span-1">
                    <p className="text-lg font-semibold text-foreground">3 min</p>
                    <p>to first answer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
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

        {/* Pricing Section */}
        <section id="pricing" className="border-t">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Pricing
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Start free, scale when ready
              </h2>
              <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
                Get started with a generous free tier. Upgrade to Pro when you need more projects and higher limits.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Tier */}
              <div className="rounded-xl border bg-background p-8 shadow-sm hover:border-primary/50 transition-colors">
                <h3 className="text-xl font-semibold tracking-tight">Free</h3>
                <p className="text-sm text-muted-foreground mt-1">For getting started</p>
                <div className="mt-6 mb-8">
                  <span className="text-4xl font-extrabold">₹0</span>
                  <span className="text-muted-foreground ml-2">forever</span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    1 project
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    200K token cap
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Community support
                  </li>
                </ul>
                <div className="mt-8">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/auth/register">Get Started</Link>
                  </Button>
                </div>
              </div>

              {/* Pro Tier */}
              <div className="rounded-xl border-2 border-primary/30 bg-background p-8 shadow-md relative">
                <Badge className="absolute -top-2.5 left-6 text-[10px]">
                  Most Popular
                </Badge>
                <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  Pro
                  <Sparkles className="h-4 w-4 text-primary" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">For serious projects</p>
                <div className="mt-6 mb-8">
                  <span className="text-4xl font-extrabold">₹499</span>
                  <span className="text-muted-foreground ml-2">/ 30 days</span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    5 projects
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    2M token cap
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Higher token limits
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    Priority support
                  </li>
                </ul>
                <div className="mt-8">
                  <Button className="w-full" asChild>
                    <Link href={isAuth ? "/billing" : "/auth/register"}>
                      {isAuth ? "Upgrade Now" : "Start Free, Upgrade Later"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="rounded-2xl border bg-background p-8 sm:p-10 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to build?</h3>
                <p className="mt-4 max-w-[520px] text-muted-foreground">
                  Join developers building the next generation of AI assistants with Contextly.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/auth/register">Start for free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-6 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8 md:flex-row">
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
