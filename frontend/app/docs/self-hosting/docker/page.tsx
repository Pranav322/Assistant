import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Self-Hosting with Docker",
  description: "Deploy Contextly self-hosted services with Docker and Docker Compose.",
  path: "/docs/self-hosting/docker",
});

const content = `# Docker Deployment

Deploy using Docker Compose for local development.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/example/rag-prod.git
cd rag-prod

# Create environment file
cp .env.example .env

# Start all services
docker-compose up -d
\`\`\`

## Services

| Service | Port | Description |
|---------|------|-------------|
| api | 8000 | FastAPI server |
| worker | - | Background workers |
| postgres | 5432 | Database |
| redis | 6379 | Cache/Queue |

## Development Mode

\`\`\`bash
# Start with hot reload
docker-compose up

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api alembic upgrade head
\`\`\`

## Production Mode

\`\`\`bash
docker-compose -f docker-compose.production.yml up -d
\`\`\`

## Common Commands

\`\`\`bash
# Restart a service
docker-compose restart api

# View logs
docker-compose logs -f

# Stop all
docker-compose down
\`\`\`
`;

export default function DockerPage() {
  return <Markdown>{content}</Markdown>;
}
