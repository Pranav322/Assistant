import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Production Deployment",
  description: "Best practices for secure, scalable, and reliable Contextly production deployments.",
  path: "/docs/self-hosting/production",
});

const content = `# Production Deployment

Production deployment guide with security hardening.

## Architecture

\`\`\`
                    ┌─────────────────┐
                    │ Cloudflare/CDN  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Load Balancer   │
                    │    (Nginx)      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │  API 1  │        │  API 2  │        │ Worker  │
    └────┬────┘        └────┬────┘        └─────────┘
         │                   │
         └─────────┬─────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│Postgres │  │  Redis  │  │   S3    │
└─────────┘  └─────────┘  └─────────┘
\`\`\`

## Prerequisites

- **VPS**: 4GB RAM, 2 vCPU (minimum)
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis
- **Storage**: S3-compatible (R2, S3)

## Environment Setup

### 1. Server Setup

\`\`\`bash
ssh user@your-server
mkdir -p /opt/chatbot
git clone https://github.com/example/rag-prod.git .
\`\`\`

### 2. Environment Variables

Create \`.env.production\`:

\`\`\`bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
REDIS_URL="redis://:pass@host:6379/0"
JWT_SECRET="$(openssl rand -base64 32)"

AZURE_OPENAI_API_KEY="your-key"
AZURE_OPENAI_ENDPOINT="https://resource.openai.azure.com/"
AZURE_DEPLOYMENT_NAME="gpt-4"

ENVIRONMENT="production"
LOG_LEVEL="INFO"
\`\`\`

## Docker Deployment

\`\`\`bash
# Build images
docker build -f Dockerfile.api -t chatbot-api:latest .
docker build -f Dockerfile.worker -t chatbot-worker:latest .

# Start services
docker-compose -f docker-compose.production.yml up -d
\`\`\`

## SSL Certificates

\`\`\`bash
sudo certbot --nginx -d api.yourdomain.com -d widget.yourdomain.com
\`\`\`

## Security Hardening

### Firewall

\`\`\`bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
\`\`\`

### Security Headers

\`\`\`nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
\`\`\`

## Scaling

\`\`\`bash
# Add more API instances
docker-compose up -d --scale api=3

# Add more workers
docker-compose up -d --scale worker=4
\`\`\`

## Checklist

- [ ] Domain configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups scheduled
`;

export default function ProductionPage() {
  return <Markdown>{content}</Markdown>;
}
