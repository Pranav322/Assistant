import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, Upload, Bot, Zap, Code, Shield, Database } from "lucide-react";
import { HomeAuthNav, RagHeroAuthCTA } from "@/components/marketing-auth";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Build a RAG Chatbot from Documents",
  description:
    "Upload PDFs, text files, or URLs and launch a production-ready RAG chatbot in minutes with Contextly.",
  path: "/rag-chatbot-from-documents",
});

export default function RagChatbotFromDocuments() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Build a RAG Chatbot from Your Documents | Contextly",
    description:
      "Upload PDFs, Markdown, and let Contextly index your data. Build and embed a high-performance RAG chatbot in minutes with no coding required.",
    url: "https://contextly.live/rag-chatbot-from-documents",
    publisher: {
      "@type": "Organization",
      name: "Contextly",
      url: "https://contextly.live",
    },
  };

  return (
    <div className="bg-background selection:bg-primary/10 flex min-h-screen flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header Area */}
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">Contextly</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/#pricing"
              className="text-muted-foreground hover:text-primary hidden text-sm font-medium transition-colors sm:inline-block"
            >
              Pricing
            </Link>
            <HomeAuthNav />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>

          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
                No Coding Required • 3 Minutes Setup
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl">
                Build a RAG Chatbot <br className="hidden sm:block" />
                <span className="text-primary">from your Documents</span>
              </h1>
              <p className="text-muted-foreground mt-6 text-lg leading-relaxed text-balance sm:text-xl">
                Upload PDFs, TXTs, or paste your website URL. Contextly automatically splits,
                chunks, and indexes your document&apos;s knowledge to power an intelligent chatbot
                you can embed anywhere.
              </p>

              <RagHeroAuthCTA />

              <p className="text-muted-foreground mt-6 flex items-center justify-center gap-2 text-sm">
                <Shield className="h-4 w-4" /> 200,000 free tokens. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How to create a custom AI assistant
              </h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg text-balance">
                The fastest way to deploy a Retrieval-Augmented Generation (RAG) system without
                managing vector databases or LLM pipelines.
              </p>
            </div>

            <div className="relative mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              {/* Connector line on desktop */}
              <div className="bg-border/40 absolute top-12 right-[15%] left-[15%] z-0 hidden h-0.5 md:block"></div>

              {/* Step 1 */}
              <div className="bg-background relative z-10 flex flex-col items-center rounded-2xl border p-6 text-center shadow-sm">
                <div className="bg-primary/10 text-primary ring-background mb-6 flex h-16 w-16 items-center justify-center rounded-full ring-8">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">1. Upload your Knowledge</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Drag and drop business documents, manuals, whitepapers (PDF, TXT, DOCX) or simply
                  paste links to your website or Help Center.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-background relative z-10 flex flex-col items-center rounded-2xl border p-6 text-center shadow-sm">
                <div className="bg-primary/10 text-primary ring-background mb-6 flex h-16 w-16 items-center justify-center rounded-full ring-8">
                  <Database className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">2. Contextly Indexes</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our semantic ingestion engine automatically cleans, chunks, and creates vector
                  embeddings of your data in a secure, isolated tenant.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-background relative z-10 flex flex-col items-center rounded-2xl border p-6 text-center shadow-sm">
                <div className="bg-primary/10 text-primary ring-background mb-6 flex h-16 w-16 items-center justify-center rounded-full ring-8">
                  <Code className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">3. Embed the Widget</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Copy our lightweight script tag or use our React package. Drop it into any site,
                  test the responses, and let users chat with your data instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Benefits */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Everything you need for production RAG
                </h2>
                <p className="text-muted-foreground mt-4 text-lg text-balance">
                  Stop worrying about API rate limits, database connections, and layout code.
                  Contextly wraps everything up.
                </p>

                <div className="mt-8 space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-primary/10 text-primary h-fit rounded-lg p-2">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">Multi-Format Support</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Accepts unstructured PDF files, Word docs, Markdown files, or raw text. We
                        handle the parsing logic behind the scenes.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-primary/10 text-primary h-fit rounded-lg p-2">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">Website Scraping</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Want to build a chatbot using your public blog or documentation? Just paste
                        the sitemap or root URL.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-primary/10 text-primary h-fit rounded-lg p-2">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">Highly Accurate Retrieval</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Advanced hybrid search and reranking ensure the AI responds with pinpoint
                        relevance and minimizes hallucination.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-primary/10 text-primary h-fit rounded-lg p-2">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">Plug & Play UI</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Includes a modern, responsive chat interface straight out of the box with
                        zero CSS configuration needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/40 relative flex h-full min-h-[400px] items-center justify-center overflow-hidden rounded-2xl border p-6 sm:p-8">
                {/* Decorative Elements simulating code/file uploads */}
                <div className="absolute top-10 right-10 flex rotate-12 gap-2 opacity-80">
                  <div className="bg-background flex h-20 w-16 flex-col justify-center gap-2 rounded-lg border p-2 shadow-sm">
                    <div className="bg-muted-foreground/20 h-1 w-full rounded"></div>
                    <div className="bg-muted-foreground/20 h-1 w-3/4 rounded"></div>
                    <div className="bg-muted-foreground/20 h-1 w-5/6 rounded"></div>
                  </div>
                </div>
                <div className="absolute bottom-12 left-8 flex -rotate-12 gap-2 opacity-80">
                  <div className="bg-background flex h-16 w-20 items-center justify-center rounded-lg border p-2 shadow-sm">
                    <span className="text-muted-foreground font-mono text-[10px]">{"{JSON}"}</span>
                  </div>
                </div>

                {/* Simulated Chat Interface */}
                <div className="bg-background z-10 flex h-[350px] w-full max-w-sm flex-col overflow-hidden rounded-xl border shadow-xl">
                  <div className="bg-muted/50 flex h-12 items-center border-b px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-semibold">DocsBot v1.0</span>
                    </div>
                  </div>
                  <div className="bg-muted/5 flex flex-1 flex-col gap-3 overflow-hidden p-4">
                    <div className="bg-muted w-[85%] self-end rounded-lg rounded-tr-none px-3 py-2 text-xs">
                      How do I invite team members using the API?
                    </div>
                    <div className="bg-primary/10 text-primary-foreground text-foreground border-primary/20 w-[90%] self-start rounded-lg rounded-tl-none border px-3 py-2 text-xs">
                      <p className="mb-2 font-medium">Based on the uploaded Developer Docs:</p>
                      <p>
                        You can invite team members by making a POST request to{" "}
                        <code className="bg-background rounded border px-1 py-0.5">
                          /api/v1/team/invite
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                  <div className="bg-background border-t p-3">
                    <div className="bg-muted text-muted-foreground flex h-8 items-center rounded-md px-3 text-xs">
                      Ask me anything about these docs...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="bg-primary text-primary-foreground px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to chat with your own data?
            </h2>
            <p className="text-primary-foreground/80 mt-4 text-lg text-balance">
              Join developers building AI pipelines 10x faster with Contextly. Get started for free
              today.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="text-primary h-12 px-8 text-base font-semibold"
                asChild
              >
                <Link href="/auth/register">Create Free Account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 hover:bg-primary-foreground/10 h-12 bg-transparent px-8 text-base font-semibold text-white hover:text-white"
                asChild
              >
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Area */}
      <footer className="bg-background border-t py-12">
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
