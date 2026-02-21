import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Self-Hosting Configuration",
  description: "Configure environment variables, services, and runtime settings for self-hosted Contextly.",
  path: "/docs/self-hosting/configuration",
});

const content = `# Configuration

Complete reference for all environment variables.

## Required Variables

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| \`DATABASE_URL\` | PostgreSQL connection string | \`postgresql://user:pass@host:5432/db\` |

### Redis

| Variable | Description | Example |
|----------|-------------|---------|
| \`REDIS_URL\` | Redis connection string | \`redis://localhost:6379/0\` |

### Security

| Variable | Description |
|----------|-------------|
| \`JWT_SECRET\` | Secret for JWT signing (min 32 bytes) - generate with: \`openssl rand -base64 32\` |

### AI Services

| Variable | Description |
|----------|-------------|
| \`AZURE_OPENAI_API_KEY\` | Azure OpenAI API key |
| \`AZURE_OPENAI_ENDPOINT\` | Azure OpenAI endpoint |
| \`AZURE_OPENAI_API_VERSION\` | API version (e.g., 2024-02-01) |
| \`AZURE_DEPLOYMENT_NAME\` | Chat model deployment |
| \`AZURE_EMBEDDING_DEPLOYMENT_NAME\` | Embedding deployment |

### Storage

| Variable | Description |
|----------|-------------|
| \`S3_ENDPOINT\` | S3-compatible endpoint |
| \`S3_BUCKET\` | Bucket name |
| \`S3_ACCESS_KEY_ID\` | Access key |
| \`S3_SECRET_ACCESS_KEY\` | Secret key |
| \`S3_REGION\` | Region (for R2 use \`auto\`) |
| \`S3_PUBLIC_URL\` | Public URL for files |

## Optional Variables

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| \`ADMIN_API_KEY\` | - | Admin API key for system operations |
| \`LOG_LEVEL\` | \`INFO\` | Logging level |
| \`WIDGET_TOKEN_EXPIRE_SECONDS\` | \`86400\` | Widget token TTL (24 hours) |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| \`RATE_LIMIT_REQUESTS_PER_MINUTE\` | \`60\` | General request limit |
| \`RATE_LIMIT_TOKENS_PER_MINUTE\` | \`100000\` | Token limit per minute |
| \`RATE_LIMIT_CHAT_PER_MINUTE\` | \`60\` | Chat request limit |

### File Processing

| Variable | Default | Description |
|----------|---------|-------------|
| \`MAX_FILE_SIZE_MB\` | \`50\` | Maximum upload size |
| \`MAX_PDF_PAGES\` | \`1000\` | Maximum PDF pages |

## Example .env File

\`\`\`bash
# Database
DATABASE_URL="postgresql://chatbot:password@localhost:5432/chatbot"

# Redis
REDIS_URL="redis://localhost:6379/0"

# Security
JWT_SECRET="your-32-byte-secret-key-here-minimum"

# Azure OpenAI
AZURE_OPENAI_API_KEY="your-azure-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_API_VERSION="2024-02-01"
AZURE_DEPLOYMENT_NAME="gpt-4"
AZURE_EMBEDDING_DEPLOYMENT_NAME="text-embedding-3-small"

# S3 Storage
S3_ENDPOINT="https://r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="chatbot-files"
S3_ACCESS_KEY_ID="your-key"
S3_SECRET_ACCESS_KEY="your-secret"
S3_PUBLIC_URL="https://files.example.com"

# Application
LOG_LEVEL="INFO"
\`\`\`

## Generating Secrets

\`\`\`bash
# Generate JWT secret (32+ bytes)
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
\`\`\`
`;

export default function ConfigurationPage() {
  return <Markdown>{content}</Markdown>;
}
