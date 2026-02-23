import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Getting Started",
  description:
    "Learn the Contextly basics and how to launch your first retrieval-augmented chatbot.",
  path: "/docs/getting-started",
});

const content = `# Welcome to Contextly

Contextly is a platform that lets you build AI chatbots powered by your own content. Upload your documents, and your users can chat with them through an embeddable widget on your website.

## How It Works

1. **Create a project** — Each project is an independent chatbot with its own knowledge base
2. **Add your content** — Upload PDFs, text files, or paste URLs. Contextly processes and indexes them automatically
3. **Embed the widget** — Drop a single script tag on your site and your chatbot is live

## What You Can Do

- **Upload documents** — PDF, Markdown, and plain text files
- **Add web pages** — Paste a URL and the content is fetched automatically
- **Embed a chat widget** — Works on any website with a single script tag
- **Manage API keys** — Control programmatic access to your project
- **Track usage** — See how many messages and tokens your chatbot is using

## Next Steps

| Guide | Description |
|-------|-------------|
| [Quickstart](/docs/getting-started/quickstart) | Create your first chatbot in 5 minutes |
| [Projects](/docs/platform/projects) | Managing projects and knowledge bases |
| [Chat Widget](/docs/platform/widget) | Embedding the widget on your site |
| [Self-Hosting](/docs/self-hosting/) | Run the platform on your own infrastructure |
`;

export default function GettingStartedPage() {
  return <Markdown>{content}</Markdown>;
}
