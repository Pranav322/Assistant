# Installation

This guide covers setting up your development environment for Contextly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** - Required for the backend
- **Node.js 18+** - Required for the frontend
- **pnpm** - Package manager for frontend (see [installation guide](https://pnpm.io/installation))
- **Docker & Docker Compose** - For local database/services
- **uv** - Python package manager (see below)

## Install uv (Python Package Manager)

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via pip
pip install uv
```

## Clone the Repository

```bash
git clone https://github.com/example/rag-prod.git
cd rag-prod
```

## Install Backend Dependencies

```bash
# Install all dependencies (including dev dependencies)
uv sync

# Or install only runtime dependencies
uv pip install -e .
```

## Install Frontend Dependencies

```bash
cd frontend
pnpm install
cd ..
```

## Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. Required variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ragchatbot"

# Redis
REDIS_URL="redis://localhost:6379/0"

# Security (generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-here"

# Azure OpenAI (or use OpenAI directly)
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_API_VERSION="2024-02-01"
AZURE_DEPLOYMENT_NAME="gpt-4"
AZURE_EMBEDDING_DEPLOYMENT_NAME="text-embedding-3-small"

# S3 Storage (Cloudflare R2, AWS S3, etc.)
S3_ENDPOINT="https://r2.cloudflarestorage.com"
S3_BUCKET="your-bucket"
S3_ACCESS_KEY_ID="your-key"
S3_SECRET_ACCESS_KEY="your-secret"
```

## Start Local Services

Use Docker Compose to start required services:

```bash
docker-compose up -d postgres redis
```

Verify services are running:

```bash
docker ps
# You should see postgres and redis containers
```

## Initialize Database

Run database migrations:

```bash
uv run alembic upgrade head
```

## Start the Backend

```bash
# Development mode with auto-reload
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## Start the Frontend

```bash
cd frontend
pnpm dev
```

The dashboard will be available at `http://localhost:3000`

## Verify Installation

1. Visit `http://localhost:3000` - You should see the login page
2. Register a new account
3. Create a project
4. Navigate to project settings to get your API key

## Common Issues

### Database Connection Error

Make sure PostgreSQL is running:
```bash
docker-compose up -d postgres
```

### Redis Connection Error

Make sure Redis is running:
```bash
docker-compose up -d redis
```

### Port Already in Use

If port 8000 or 3000 is in use, specify a different port:
```bash
uv run uvicorn app.main:app --reload --port 8001
```

## Next Steps

- [Quickstart Guide](quickstart.md) - Add your first document and chat
- [Configuration](configuration.md) - Full environment variable reference
