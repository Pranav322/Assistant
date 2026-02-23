import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "Docs",
    template: "%s | Contextly Docs",
  },
  description:
    "Documentation for Contextly's RAG chatbot platform, including setup, widget embedding, API keys, and self-hosting.",
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

export default function DocsLayout({ children }: { children: React.ReactNode }) {
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
    <div className="bg-background flex min-h-screen flex-col">
      {/* Top header */}
      <header className="bg-background/95 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">Contextly</span>
          </Link>
          <nav className="ml-auto flex items-center gap-8 text-sm font-medium">
            <Link
              href="/projects"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link href="/docs" className="text-zinc-900 dark:text-zinc-100">
              Docs
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-[240px_1fr]">
            {/* Sidebar - with more space from left */}
            <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] overflow-y-auto lg:block">
              <nav className="flex flex-col gap-8 text-sm">
                {Object.entries(navItems).map(([category, items]) => (
                  <div key={category} className="flex flex-col gap-2">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{category}</h4>
                    <div className="flex flex-col gap-0.5 border-l border-zinc-200 pl-4 dark:border-zinc-800">
                      {items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="-ml-[17px] border-l-2 border-transparent py-1.5 pl-4 text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
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
              <div className="mx-auto max-w-3xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
