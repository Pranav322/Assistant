import { Markdown } from "@/components/markdown";

const content = `# Using the Platform

Everything you need to know about managing your chatbots.

## Sections

| Page | Description |
|------|-------------|
| [Projects](/docs/platform/projects) | Create projects, upload documents, manage knowledge bases |
| [Chat Widget](/docs/platform/widget) | Embed the chatbot on your website |
| [API Keys](/docs/platform/api-keys) | Create and manage API keys for programmatic access |
| [Analytics](/docs/platform/analytics) | Track usage, messages, and token consumption |
`;

export default function PlatformPage() {
    return <Markdown>{content}</Markdown>;
}
