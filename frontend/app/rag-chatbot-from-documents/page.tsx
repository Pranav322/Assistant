"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Globe, Upload, Bot, Zap, Code, Shield, Database } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

export default function RagChatbotFromDocuments() {
    const [isAuth, setIsAuth] = useState<boolean | null>(null);

    useEffect(() => {
        setIsAuth(isAuthenticated());
    }, []);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Build a RAG Chatbot from Your Documents | Contextly",
        "description": "Upload PDFs, Markdown, and let Contextly index your data. Build and embed a high-performance RAG chatbot in minutes with no coding required.",
        "url": "https://www.contextly.live/rag-chatbot-from-documents",
        "publisher": {
            "@type": "Organization",
            "name": "Contextly",
            "url": "https://www.contextly.live"
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10 overflow-x-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {/* Header Area */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                            C
                        </div>
                        <span className="text-sm font-semibold tracking-tight">
                            Contextly
                        </span>
                    </Link>
                    <nav className="flex items-center gap-2 sm:gap-4">
                        <Link
                            href="/#pricing"
                            className="hidden sm:inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                            Pricing
                        </Link>
                        {isAuth === null ? (
                            <div className="w-20 h-9 bg-muted/20 animate-pulse rounded-md" />
                        ) : isAuth ? (
                            <Button asChild size="sm">
                                <Link href="/projects">Go to Dashboard</Link>
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
                                    <Link href="/auth/register">Get Started</Link>
                                </Button>
                            </>
                        )}
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
                            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-balance">
                                Build a RAG Chatbot <br className="hidden sm:block" />
                                <span className="text-primary">from your Documents</span>
                            </h1>
                            <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed text-balance">
                                Upload PDFs, TXTs, or paste your website URL. Contextly automatically splits, chunks, and indexes your document's knowledge to power an intelligent chatbot you can embed anywhere.
                            </p>

                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base shadow-sm" asChild>
                                    <Link href={isAuth ? "/projects" : "/auth/register"}>
                                        {isAuth ? "Go to Dashboard" : "Start Building for Free"}
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto px-8 text-base" asChild>
                                    <Link href="/auth/login">Watch Demo</Link>
                                </Button>
                            </div>

                            <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Shield className="h-4 w-4" /> 200,000 free tokens. No credit card required.
                            </p>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="bg-muted/30 py-16 sm:py-24">
                    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How to create a custom AI assistant</h2>
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                                The fastest way to deploy a Retrieval-Augmented Generation (RAG) system without managing vector databases or LLM pipelines.
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto relative">
                            {/* Connector line on desktop */}
                            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border/40 z-0"></div>

                            {/* Step 1 */}
                            <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-background border shadow-sm">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6 ring-8 ring-background">
                                    <Upload className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">1. Upload your Knowledge</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Drag and drop business documents, manuals, whitepapers (PDF, TXT, DOCX) or simply paste links to your website or Help Center.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-background border shadow-sm">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6 ring-8 ring-background">
                                    <Database className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">2. Contextly Indexes</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Our semantic ingestion engine automatically cleans, chunks, and creates vector embeddings of your data in a secure, isolated tenant.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-background border shadow-sm">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6 ring-8 ring-background">
                                    <Code className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">3. Embed the Widget</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Copy our lightweight script tag or use our React package. Drop it into any site, test the responses, and let users chat with your data instantly.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features / Benefits */}
                <section className="py-16 sm:py-24">
                    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-12 lg:grid-cols-2 items-center">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need for production RAG</h2>
                                <p className="mt-4 text-lg text-muted-foreground text-balance">
                                    Stop worrying about API rate limits, database connections, and layout code. Contextly wraps everything up.
                                </p>

                                <div className="mt-8 space-y-6">
                                    <div className="flex gap-4">
                                        <div className="bg-primary/10 p-2 rounded-lg h-fit text-primary">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">Multi-Format Support</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Accepts unstructured PDF files, Word docs, Markdown files, or raw text. We handle the parsing logic behind the scenes.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-primary/10 p-2 rounded-lg h-fit text-primary">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">Website Scraping</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Want to build a chatbot using your public blog or documentation? Just paste the sitemap or root URL.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-primary/10 p-2 rounded-lg h-fit text-primary">
                                            <Bot className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">Highly Accurate Retrieval</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Advanced hybrid search and reranking ensure the AI responds with pinpoint relevance and minimizes hallucination.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-primary/10 p-2 rounded-lg h-fit text-primary">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">Plug & Play UI</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Includes a modern, responsive chat interface straight out of the box with zero CSS configuration needed.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/40 border rounded-2xl p-6 sm:p-8 h-full min-h-[400px] flex items-center justify-center overflow-hidden relative">
                                {/* Decorative Elements simulating code/file uploads */}
                                <div className="absolute top-10 right-10 flex gap-2 rotate-12 opacity-80">
                                    <div className="h-20 w-16 bg-background rounded-lg border shadow-sm flex flex-col gap-2 p-2 justify-center">
                                        <div className="h-1 w-full bg-muted-foreground/20 rounded"></div>
                                        <div className="h-1 w-3/4 bg-muted-foreground/20 rounded"></div>
                                        <div className="h-1 w-5/6 bg-muted-foreground/20 rounded"></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-12 left-8 flex gap-2 -rotate-12 opacity-80">
                                    <div className="h-16 w-20 bg-background rounded-lg border shadow-sm flex items-center justify-center p-2">
                                        <span className="text-[10px] font-mono text-muted-foreground">{"{JSON}"}</span>
                                    </div>
                                </div>

                                {/* Simulated Chat Interface */}
                                <div className="w-full max-w-sm bg-background border rounded-xl shadow-xl overflow-hidden z-10 flex flex-col h-[350px]">
                                    <div className="h-12 bg-muted/50 border-b flex items-center px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs font-semibold">DocsBot v1.0</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden bg-muted/5">
                                        <div className="bg-muted px-3 py-2 rounded-lg rounded-tr-none text-xs w-[85%] self-end">
                                            How do I invite team members using the API?
                                        </div>
                                        <div className="bg-primary/10 text-primary-foreground text-foreground px-3 py-2 rounded-lg rounded-tl-none text-xs w-[90%] self-start border border-primary/20">
                                            <p className="mb-2 font-medium">Based on the uploaded Developer Docs:</p>
                                            <p>You can invite team members by making a POST request to <code className="bg-background px-1 py-0.5 rounded border">/api/v1/team/invite</code>.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 border-t bg-background">
                                        <div className="h-8 rounded-md bg-muted flex items-center px-3 text-xs text-muted-foreground">
                                            Ask me anything about these docs...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA section */}
                <section className="bg-primary px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-primary-foreground text-center">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">Ready to chat with your own data?</h2>
                        <p className="mt-4 text-lg text-primary-foreground/80 text-balance">
                            Join developers building AI pipelines 10x faster with Contextly. Get started for free today.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                            <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold text-primary" asChild>
                                <Link href="/auth/register">Create Free Account</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-primary-foreground/20 text-white bg-transparent hover:bg-primary-foreground/10 hover:text-white" asChild>
                                <Link href="/">Back to Home</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer Area */}
            <footer className="border-t py-12 bg-background">
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
