import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = {
    "Getting Started": [
      { href: "/docs/getting-started/", label: "Overview" },
      { href: "/docs/getting-started/installation", label: "Installation" },
      { href: "/docs/getting-started/quickstart", label: "Quickstart" },
      { href: "/docs/getting-started/configuration", label: "Configuration" },
    ],
    Guides: [
      { href: "/docs/guides/", label: "Overview" },
      { href: "/docs/guides/widget-embedding", label: "Widget Embedding" },
      { href: "/docs/guides/api-keys", label: "API Keys" },
      { href: "/docs/guides/authentication", label: "Authentication" },
    ],
    "API Reference": [
      { href: "/docs/api-reference/", label: "Overview" },
      { href: "/docs/api-reference/authentication", label: "Authentication" },
      { href: "/docs/api-reference/projects", label: "Projects" },
      { href: "/docs/api-reference/chat", label: "Chat" },
      { href: "/docs/api-reference/sources", label: "Sources" },
    ],
    Concepts: [
      { href: "/docs/concepts/", label: "Overview" },
      { href: "/docs/concepts/architecture", label: "Architecture" },
      { href: "/docs/concepts/retrieval-pipeline", label: "Retrieval Pipeline" },
      { href: "/docs/concepts/security", label: "Security" },
    ],
    Deployment: [
      { href: "/docs/deployment/", label: "Overview" },
      { href: "/docs/deployment/docker", label: "Docker" },
      { href: "/docs/deployment/production", label: "Production" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-purple-600">◆</span>
            RAG Platform
          </Link>
          <nav className="ml-8 flex items-center gap-6 text-sm">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link href="/docs" className="text-foreground font-medium">Docs</Link>
          </nav>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar */}
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block overflow-y-auto border-r py-6 pr-6 lg:py-8">
          <nav className="flex w-full flex-col gap-6">
            {Object.entries(navItems).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-3 text-foreground">{category}</h4>
                <ul className="flex flex-col gap-1">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2 py-1.5 transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content - centered */}
        <main className="relative py-6 lg:py-8 w-full">
          <div className="mx-auto max-w-3xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
