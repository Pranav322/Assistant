import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CopyBlock from "@/components/CopyBlock";
import { CheckCircle2, Layers, Search, Zap, Shield, Code, Package, Sparkles } from "lucide-react";
import { HomeAuthNav, HomeHeroAuthCTA } from "@/components/marketing-auth";
import { PricingTiers } from "@/components/pricing-tiers";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Enterprise RAG Chatbots for Your Platform",
  description:
    "Build, embed, and monitor production RAG chatbots in minutes with Contextly. Ingest docs, power retrieval, and ship a secure AI assistant fast.",
  path: "/",
});

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Contextly",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    description:
      "Build, embed, and monitor production RAG chatbots in minutes. Contextly handles ingestion, retrieval, auth, and observability.",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "120",
    },
  };

  return (
    <div className="bg-background selection:bg-primary/10 flex min-h-screen flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">Contextly</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
            <HomeAuthNav />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="bg-muted/30 absolute inset-y-0 right-0 -z-10 w-full lg:w-1/2" />
          <div className="bg-primary/10 absolute top-0 right-0 -z-10 h-64 w-64 rounded-full opacity-50 blur-3xl sm:h-96 sm:w-96 sm:opacity-100" />
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
            <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
              <div className="animate-slide-in-from-bottom text-left">
                <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
                  The RAG Chatbot Platform for Developers
                </Badge>
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:leading-[1.1]">
                  Ship intelligent <span className="text-primary">RAG chatbots</span>{" "}
                  <span className="block sm:inline">in minutes.</span>
                </h1>
                <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-balance sm:text-xl">
                  A complete toolkit for building retrieval-augmented generation apps.
                  <span className="text-foreground font-medium"> Embed custom chatbots</span>{" "}
                  directly in your existing app. Handles ingestion, retrieval, auth, and
                  observability so you can focus on your users.
                </p>
                <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <HomeHeroAuthCTA />
                </div>

                <div className="mt-6 pt-2">
                  <Link
                    href="/rag-chatbot-from-documents"
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Sparkles className="text-primary h-4 w-4" />
                    <span>Build a RAG chatbot from your documents</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>

                <div className="text-muted-foreground mt-10 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                    <span>Instant Chatbot Knowledge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                    <span>Embed Chatbot anywhere</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                    <span>Production Scale RAG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                    <span>Secure by Default</span>
                  </div>
                </div>
              </div>

              <div className="animate-slide-in-from-top relative mt-8 w-full min-w-0 lg:mt-0">
                <div className="bg-background overflow-hidden rounded-2xl border shadow-xl">
                  {/* Card header */}
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md">
                        <Code className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-semibold">Embed with one line</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wide">
                      HTML / Any Framework
                    </Badge>
                  </div>

                  {/* Code snippet */}
                  <div className="bg-muted/30 px-5 py-4">
                    <CopyBlock
                      className="text-xs"
                      value={`<script
  src="https://contextly.live/embed.js"
  data-project-id="YOUR_PROJECT_ID"
  data-api-key="YOUR_API_KEY"
  defer
></script>`}
                    />
                  </div>

                  {/* Feature bullets */}
                  <div className="space-y-2.5 border-t px-5 py-4">
                    <div className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-muted-foreground">
                        Drop one tag — no server setup, no token management
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-muted-foreground">
                        Works in any HTML page, Next.js, Vue, or plain React
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-muted-foreground">
                        Auto-updates, auto-refreshes auth — zero maintenance
                      </span>
                    </div>
                  </div>

                  {/* React SDK coming soon */}
                  <div className="border-t px-5 py-3">
                    <div className="flex items-center gap-2.5 rounded-lg border border-dashed bg-muted/20 px-3.5 py-2.5">
                      <Package className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="text-muted-foreground text-xs">
                        React SDK — headless hooks &amp; components
                      </span>
                      <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                        In development
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-muted-foreground mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-background/80 rounded-xl border p-3">
                    <p className="text-foreground text-lg font-bold">99.9%</p>
                    <p>uptime</p>
                  </div>
                  <div className="bg-background/80 rounded-xl border p-3">
                    <p className="text-foreground text-lg font-bold">30+ GB</p>
                    <p>knowledge indexed daily</p>
                  </div>
                  <div className="bg-background/80 rounded-xl border p-3">
                    <p className="text-foreground text-lg font-bold">3 min</p>
                    <p>to first answer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/20 border-t">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.35fr_0.65fr]">
              <div className="space-y-4">
                <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">
                  Integration
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Seamlessly integrate AI chat into your product
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Drop our pre-built widget into your frontend or use the API for full control. We
                  handle the complexity of RAG so you can focus on your users.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="bg-background rounded-xl border p-6 shadow-sm">
                  <div className="bg-primary/10 text-primary mb-4 w-fit rounded-lg p-3">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Document Ingestion</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Upload PDFs, Markdown, or simply paste your website URL to instantly train the
                    chatbot on your specific knowledge base.
                  </p>
                </div>
                <div className="bg-background rounded-xl border p-6 shadow-sm">
                  <div className="bg-primary/10 text-primary mb-4 w-fit rounded-lg p-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Semantic Search</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    High-performance vector retrieval tuned for accuracy, relevance, and context
                    window limits.
                  </p>
                </div>
                <div className="bg-background rounded-xl border p-6 shadow-sm">
                  <div className="bg-primary/10 text-primary mb-4 w-fit rounded-lg p-3">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Embeddable Widget & SDK</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Use our pre-built widget or the{" "}
                    <code className="bg-secondary text-secondary-foreground rounded border px-1 py-0.5 text-xs font-semibold">
                      contextly
                    </code>{" "}
                    npm package for React apps. Full control, zero config.
                  </p>
                </div>
                <div className="bg-background rounded-xl border p-6 shadow-sm">
                  <div className="bg-primary/10 text-primary mb-4 w-fit rounded-lg p-3">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Secure by Default</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Enterprise-grade auth with API keys, rate limiting, and tenant isolation built
                    in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-t">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-muted-foreground mb-4 text-xs tracking-[0.3em] uppercase">
                Pricing
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Start free, scale when ready
              </h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-lg">
                Get started with a generous free tier. Upgrade to Pro when you need more projects
                and higher limits.
              </p>
            </div>

            <PricingTiers />
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="bg-background flex flex-col gap-6 rounded-2xl border p-8 shadow-sm sm:p-10 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to build?</h3>
                <p className="text-muted-foreground mt-4 max-w-[520px]">
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
        <div className="text-muted-foreground mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-6 px-4 text-sm sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold">
              O
            </div>
            <span className="text-foreground font-semibold">Contextly</span>
          </div>
          <div className="flex gap-6">
            <p>&copy; {new Date().getFullYear()} Contextly Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
