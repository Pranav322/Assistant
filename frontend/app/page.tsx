import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { HeroDemoVideo } from "@/components/hero-demo-video";
import { ShaderBackground } from "@/components/ui/shader-background";
import { HomeAuthNav, HomeHeroAuthCTA } from "@/components/marketing-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildPageMetadata } from "@/lib/seo";
import { TrustStrip } from "@/components/sections/trust-strip";
import { FeaturesGrid } from "@/components/sections/features-grid";
import { HowItWorks } from "@/components/sections/how-it-works";
import { CodeIntegration } from "@/components/sections/code-integration";
import { SecurityTrust } from "@/components/sections/security-trust";
import { StatsStrip } from "@/components/sections/stats-strip";
import { PricingSection } from "@/components/sections/pricing-section";
import { FaqSection } from "@/components/sections/faq-section";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";

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
              href="#features"
              className="text-muted-foreground hover:text-primary hidden text-sm font-medium transition-colors sm:block"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
            <HomeAuthNav />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b">
          <div className="absolute inset-0 -z-10">
            <ShaderBackground />
            <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent" />
          </div>

          <div className="mx-auto w-full max-w-[1000px] px-4 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
              Add a live chatbot to any website
            </Badge>
            <h1 className="font-display mx-auto max-w-3xl text-5xl font-bold tracking-tight text-balance sm:text-6xl md:text-7xl lg:leading-[1.05]">
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
          </div>

          <div className="mx-auto mt-14 w-full max-w-[1400px] px-4 sm:px-6 lg:mt-20 lg:px-8">
            <div className="bg-background overflow-hidden rounded-t-2xl border border-b-0 shadow-2xl">
              <HeroDemoVideo />
            </div>
          </div>
        </section>

        <TrustStrip />

        <div id="features">
          <FeaturesGrid />
        </div>

        <HowItWorks />

        <CodeIntegration />

        <SecurityTrust />

        <StatsStrip />

        <PricingSection />

        <FaqSection />

        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}
