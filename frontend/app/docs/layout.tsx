import Link from "next/link";

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
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50/50 dark:bg-gray-900/50 fixed h-full overflow-y-auto">
        <div className="p-4 border-b">
          <Link href="/" className="font-semibold text-lg">
            RAG Platform
          </Link>
          <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground mt-1">
            ← Back to App
          </Link>
        </div>
        <nav className="p-4 space-y-6">
          {Object.entries(navItems).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold mb-2">{category}</h4>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-sm text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1"
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
      <main className="flex-1 ml-64 p-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
