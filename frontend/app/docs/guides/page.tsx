import { Markdown } from "@/components/markdown";

const content = `# Guides

In-depth guides for common tasks.

- [Widget Embedding](/docs/guides/widget-embedding) - Embed the chat widget
- [API Keys](/docs/guides/api-keys) - Manage API keys
- [Authentication](/docs/guides/authentication) - Understand auth flows
`;

export default function GuidesPage() {
  return <Markdown>{content}</Markdown>;
}
