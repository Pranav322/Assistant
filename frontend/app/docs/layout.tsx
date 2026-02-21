import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "Docs",
    template: "%s | Contextly Docs",
  },
  description: "Documentation for Contextly's RAG chatbot platform, including setup, widget embedding, API keys, and self-hosting.",
  alternates: {
    canonical: absoluteUrl("/docs/getting-started"),
  },
  openGraph: {
    title: "Contextly Documentation",
    description: "Learn how to build, deploy, and manage RAG chatbots with Contextly.",
    url: absoluteUrl("/docs/getting-started"),
    siteName: "Contextly",
    type: "website",
    images: [absoluteUrl("/opengraph-image")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contextly Documentation",
    description: "Learn how to build, deploy, and manage RAG chatbots with Contextly.",
    images: [absoluteUrl("/twitter-image")],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = {
    "Getting Started": [
      { href: "/docs/getting-started/", label: "Overview" },
      { href: "/docs/getting-started/quickstart", label: "Quickstart" },
    ],
    "Using the Platform": [
      { href: "/docs/platform/", label: "Overview" },
      { href: "/docs/platform/projects", label: "Projects" },
      { href: "/docs/platform/widget", label: "Chat Widget" },
      { href: "/docs/platform/api-keys", label: "API Keys" },
      { href: "/docs/platform/analytics", label: "Analytics" },
    ],
    "Self-Hosting": [
      { href: "/docs/self-hosting/", label: "Overview" },
      { href: "/docs/self-hosting/installation", label: "Installation" },
      { href: "/docs/self-hosting/configuration", label: "Configuration" },
      { href: "/docs/self-hosting/architecture", label: "Architecture" },
      { href: "/docs/self-hosting/docker", label: "Docker" },
      { href: "/docs/self-hosting/production", label: "Production" },
    ],
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">Contextly</span>
          </Link>
          <nav className="ml-auto flex items-center gap-8 text-sm font-medium">
            <Link href="/projects" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
              Dashboard
            </Link>
            <Link href="/docs" className="text-zinc-900 dark:text-zinc-100">
              Docs
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 py-10">

            {/* Sidebar - with more space from left */}
            <aside className="hidden lg:block sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto">
              <nav className="flex flex-col gap-8 text-sm">
                {Object.entries(navItems).map(([category, items]) => (
                  <div key={category} className="flex flex-col gap-2">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {category}
                    </h4>
                    <div className="flex flex-col gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                      {items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 py-1.5 transition-colors -ml-[17px] pl-4 border-l-2 border-transparent hover:border-zinc-900 dark:hover:border-zinc-100"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main Content - Centered */}
            <main className="min-w-0 lg:py-2">
              <div className="mx-auto max-w-3xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
