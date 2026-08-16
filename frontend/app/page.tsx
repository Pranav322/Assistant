import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Search, Zap, Shield, Sparkles } from "lucide-react";
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
        <section className="relative overflow-hidden border-b">
          <div className="bg-primary/10 absolute top-0 left-1/2 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl" />

          <div className="mx-auto w-full max-w-[1000px] px-4 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
              Add a live chatbot to any website
            </Badge>
            <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-balance sm:text-6xl md:text-7xl lg:leading-[1.05]">
              Any website,{" "}
              <span className="text-primary">a working chatbot</span> in minutes.
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-balance sm:text-xl">
              Point Contextly at your docs, drop in one script tag, and a grounded AI chatbot
              goes live on your site — no infrastructure to manage.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <HomeHeroAuthCTA />
            </div>
            <div className="mt-6">
              <Link
                href="/rag-chatbot-from-documents"
                className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Sparkles className="text-primary h-4 w-4" />
                <span>Build a RAG chatbot from your documents</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Product demo — large panel bleeding below the hero copy */}
          <div className="mx-auto mt-14 w-full max-w-[1400px] px-4 sm:px-6 lg:mt-20 lg:px-8">
            <div className="bg-background overflow-hidden rounded-t-2xl border border-b-0 shadow-2xl">
              <video
                className="block aspect-video w-full"
                src="/video/hero-demo.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
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
