import { Markdown } from "@/components/markdown";

const content = `# Self-Hosting

This section is for developers who want to run the Contextly platform on their own infrastructure.

## What You'll Need

- **Python 3.11+** and **Node.js 18+**
- **Docker & Docker Compose**
- **PostgreSQL** with pgvector extension
- **Redis**
- **S3-compatible storage** (Cloudflare R2, AWS S3, MinIO)
- **Azure OpenAI** API access

## Sections

| Page | Description |
|------|-------------|
| [Installation](/docs/self-hosting/installation) | Set up the development environment |
| [Configuration](/docs/self-hosting/configuration) | Environment variables reference |
| [Architecture](/docs/self-hosting/architecture) | System design and components |
| [Docker](/docs/self-hosting/docker) | Local development with Docker Compose |
| [Production](/docs/self-hosting/production) | Deploy to production with security hardening |
`;

export default function SelfHostingPage() {
    return <Markdown>{content}</Markdown>;
}
