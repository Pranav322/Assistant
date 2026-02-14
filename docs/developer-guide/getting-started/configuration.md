# Configuration

Complete reference for all environment variables.

## Required Variables

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Redis

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |

### Security

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT signing (min 32 bytes) | `openssl rand -base64 32` |

### AI Services

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | `your-key` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | `https://resource.openai.azure.com/` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-02-01` |
| `AZURE_DEPLOYMENT_NAME` | Chat model deployment | `gpt-4` |
| `AZURE_EMBEDDING_DEPLOYMENT_NAME` | Embedding deployment | `text-embedding-3-small` |

### Storage

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint | `https://r2.cloudflarestorage.com` |
| `S3_BUCKET` | Bucket name | `chatbot-files` |
| `S3_ACCESS_KEY_ID` | Access key | `your-key` |
| `S3_SECRET_ACCESS_KEY` | Secret key | `your-secret` |
| `S3_REGION` | Region (for R2 use `auto`) | `auto` |
| `S3_PUBLIC_URL` | Public URL for files | `https://files.example.com` |

## Optional Variables

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_API_KEY` | - | Admin API key for system operations |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `SERVICE_NAME` | `rag-chatbot` | Service identifier |
| `GIT_SHA` | - | Git commit SHA for versioning |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `USER_JWT_AUDIENCE` | `rag-chatbot` | JWT audience claim |
| `JWT_ISSUER` | `rag-chatbot` | JWT issuer claim |
| `JWT_AUDIENCE` | - | Alternative JWT audience |
| `MIN_PASSWORD_LENGTH` | `8` | Minimum password length |
| `WIDGET_TOKEN_EXPIRE_SECONDS` | `86400` | Widget token TTL (24 hours) |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `60` | General request limit |
| `RATE_LIMIT_TOKENS_PER_MINUTE` | `100000` | Token limit per minute |
| `RATE_LIMIT_IP_PER_MINUTE` | `1000` | IP-based limit |
| `RATE_LIMIT_INGEST_PER_MINUTE` | `10` | Ingestion request limit |
| `RATE_LIMIT_CHAT_PER_MINUTE` | `60` | Chat request limit |
| `RATE_LIMIT_TOKEN_REFRESH_PER_MINUTE` | `30` | Token refresh limit |

### File Processing

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload size |
| `MAX_PDF_PAGES` | `1000` | Maximum PDF pages to process |
| `URL_FETCH_TIMEOUT_SECONDS` | `30` | URL fetch timeout |
| `URL_FETCH_MAX_REDIRECTS` | `5` | Maximum redirects |

### Embedding (Azure)

| Variable | Default | Description |
|----------|---------|-------------|
| `AZURE_EMBEDDING_ENDPOINT` | - | Custom embedding endpoint |
| `AZURE_EMBEDDING_API_VERSION` | - | Embedding API version |

### Storage (Advanced)

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_SSE` | - | Server-side encryption (AES256) |
| `S3_PUBLIC_URL` | - | Custom public URL |

### Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry |
| `OTEL_SAMPLE_RATE` | `1.0` | Sample rate for traces |

## Example .env File

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://chatbot:password@localhost:5432/chatbot"

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://localhost:6379/0"

# ============================================
# SECURITY
# ============================================
JWT_SECRET="your-32-byte-secret-key-here-minimum"

# ============================================
# AZURE OPENAI
# ============================================
AZURE_OPENAI_API_KEY="your-azure-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_API_VERSION="2024-02-01"
AZURE_DEPLOYMENT_NAME="gpt-4"
AZURE_EMBEDDING_DEPLOYMENT_NAME="text-embedding-3-small"

# ============================================
# S3 STORAGE
# ============================================
S3_ENDPOINT="https://r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="chatbot-files"
S3_ACCESS_KEY_ID="your-key"
S3_SECRET_ACCESS_KEY="your-secret"
S3_PUBLIC_URL="https://files.example.com"

# ============================================
# APPLICATION
# ============================================
LOG_LEVEL="INFO"
```

## Generating Secrets

```bash
# Generate JWT secret (32+ bytes)
openssl rand -base64 32

# Generate database password (24 bytes)
openssl rand -base64 24

# Generate Redis password
openssl rand -base64 24
```
