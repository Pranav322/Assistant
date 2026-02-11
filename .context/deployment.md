# DEPLOYMENT GUIDE
**Version:** 1.0.1
**Aligned with:** schema.sql v2.2, security.md v3.0
**Environment:** Production
**Last Updated:** 2026-02-12

---

## **📋 OVERVIEW**

This guide covers deploying the RAG chatbot platform to production. The architecture is designed for solo-developer operations with clear scaling paths.

### **Architecture Diagram:**

```text
┌─────────────────────────────────────────────────────────┐
│                 Cloudflare (DNS/CDN)                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                 Load Balancer (Nginx)                   │
└───────┬──────────────────────┬──────────────────────┬───┘
        │                      │                      │
┌───────▼──────┐       ┌───────▼──────┐       ┌────────▼──────┐
│  API Server  │       │  API Server  │       │   Background  │
│   (FastAPI)  │       │   (FastAPI)  │       │    Workers    │
│    VPS #1    │       │    VPS #2    │       │    VPS #3    │
└───────┬──────┘       └───────┬──────┘       └────────┬──────┘
        │                      │                       │
└──────────────────────┼──────────────────────┘
                       │
             ┌──────────▼──────────┐
             │   Managed Services  │
             ├─────────────────────┤
             │ • PostgreSQL (Neon) │
             │ • Redis (Upstash)   │
             │ • S3 (Cloudflare R2)│
             └─────────────────────┘
```

---

## **🛠️ PREREQUISITES**

### **1. Domain & DNS:**
- Register a domain (e.g., `chatbot.com`)
- Set up Cloudflare (free tier)
- Create DNS records:
  - `api.chatbot.com` → API servers
  - `widget.chatbot.com` → Widget iframe
  - `docs.chatbot.com` → Documentation

### **2. Infrastructure Requirements:**
```yaml
Minimum Requirements (Development):
- 1x VPS: 2GB RAM, 1vCPU, 20GB SSD
- PostgreSQL: 1GB RAM, shared CPU
- Redis: 256MB RAM
- Object Storage: 10GB

Production Requirements (100 users):
- 2x VPS: 4GB RAM, 2vCPU each
- PostgreSQL: 4GB RAM, 2vCPU
- Redis: 1GB RAM
- Object Storage: 100GB

Scaling Requirements (10,000 users):
- 4x VPS: 8GB RAM, 4vCPU each
- PostgreSQL: 16GB RAM, 4vCPU
- Redis Cluster: 4GB RAM
- Object Storage: 1TB+
- Load Balancer
```

### **3. Service Accounts:**
- **Cloudflare Account:** DNS, CDN, R2 storage
- **GitHub/GitLab:** Code repository
- **Docker Hub:** Container registry (optional)
- **Sentry Account:** Error tracking (optional)
- **PostgreSQL Provider:** Neon, Supabase, or AWS RDS

---

## **⚙️ ENVIRONMENT CONFIGURATION**

### **Required Environment Variables:**
Create `.env.production` file:

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
DATABASE_POOL_SIZE=20
DATABASE_STATEMENT_TIMEOUT=30000  # 30 seconds

# ============================================
# REDIS (for caching, rate limiting, queues)
# ============================================
REDIS_URL="redis://:password@host:6379/0"
REDIS_MAX_CONNECTIONS=50

# ============================================
# OBJECT STORAGE (S3-compatible)
# ============================================
S3_ENDPOINT="https://r2.cloudflarestorage.com"
S3_REGION="auto"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="chatbot-files"
S3_PUBLIC_URL="https://files.chatbot.com"

# ============================================
# SECURITY (Generate these with: openssl rand -base64 32)
# ============================================
ENCRYPTION_MASTER_KEY="c2VjcmV0LWtleS0zMi1ieXRlcy1sb25nCg=="
JWT_SECRET="another-32-byte-secret-key-minimum-256-bits"

# ============================================
# API KEYS (Azure AI Services)
# ============================================
AZURE_OPENAI_API_KEY="your-azure-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_API_VERSION="2023-05-15"
AZURE_DEPLOYMENT_NAME="gpt-4-deployment"
AZURE_EMBEDDING_DEPLOYMENT_NAME="text-embedding-3-small-deployment"

# ============================================
# APPLICATION SETTINGS
# ============================================
ENVIRONMENT="production"
LOG_LEVEL="INFO"
CORS_ORIGINS="https://widget.chatbot.com,https://admin.chatbot.com"
ALLOWED_HOSTS="api.chatbot.com,widget.chatbot.com"

# ============================================
# RATE LIMITING DEFAULTS
# ============================================
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_TOKENS_PER_MINUTE=100000
RATE_LIMIT_IP_PER_MINUTE=1000

# ============================================
# MONITORING
# ============================================
SENTRY_DSN="https://your-sentry-dsn"
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080

# ============================================
# EMAIL (For notifications)
# ============================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="noreply@chatbot.com"
SMTP_PASSWORD="app-password"
EMAIL_FROM="Chatbot <noreply@chatbot.com>"
```

### **Generating Secrets:**
```bash
# Generate encryption keys
openssl rand -base64 32  # For ENCRYPTION_MASTER_KEY
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For COOKIE_SECRET

# Generate database password
openssl rand -base64 24  # For PostgreSQL

# Generate Redis password
openssl rand -base64 24  # For Redis
```

---

## **🐳 DOCKER DEPLOYMENT**

### **Docker Compose Configuration:**
Create `docker-compose.production.yml`:

```yaml
version: '3.8'

# ============================================
# NETWORKS
# ============================================
networks:
  chatbot-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

# ============================================
# VOLUMES (Persistent storage)
# ============================================
volumes:
  postgres_data:
  redis_data:
  logs:
  prometheus_data:
  grafana_data:

# ============================================
# SERVICES
# ============================================
services:
  # ============================================
  # POSTGRESQL (with pgvector)
  # ============================================
  postgres:
    image: ankane/pgvector:latest  # Includes pgvector extension
    container_name: chatbot-postgres
    restart: unless-stopped
    networks:
      - chatbot-network
    environment:
      POSTGRES_DB: chatbot
      POSTGRES_USER: chatbot_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres.conf:/etc/postgresql/postgresql.conf
    command: >
      postgres
      -c config_file=/etc/postgresql/postgresql.conf
      -c shared_preload_libraries='pgvector'
    ports:
      - "127.0.0.1:5432:5432"  # Only expose locally
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatbot_user -d chatbot"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # PGBOUNCER (Connection pooling)
  # ============================================
  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: chatbot-pgbouncer
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - chatbot-network
    environment:
      DATABASE_URL: postgres://chatbot_user:${POSTGRES_PASSWORD}@postgres:5432/chatbot
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 20
      RESERVE_POOL_SIZE: 5
    # IMPORTANT: PgBouncer transaction pooling requires app queries
    # to always include WHERE project_id = :project_id (RLS is optional).
    volumes:
      - ./pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
    ports:
      - "127.0.0.1:6432:6432"  # PgBouncer port

  # ============================================
  # REDIS (Cache and queues)
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: chatbot-redis
    restart: unless-stopped
    networks:
      - chatbot-network
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # API SERVER (FastAPI)
  # ============================================
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
      args:
        ENVIRONMENT: production
    container_name: chatbot-api
    restart: unless-stopped
    depends_on:
      pgbouncer:
        condition: service_started
      redis:
        condition: service_healthy
    networks:
      - chatbot-network
    environment:
      # Inject all environment variables
      DATABASE_URL: postgres://chatbot_user:${POSTGRES_PASSWORD}@pgbouncer:6432/chatbot?sslmode=disable
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      # ... other env vars from .env.production
    volumes:
      - logs:/app/logs
    ports:
      - "127.0.0.1:8000:8000"  # Internal only
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # ============================================
  # BACKGROUND WORKERS (Dramatiq)
  # ============================================
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: chatbot-worker
    restart: unless-stopped
    depends_on:
      pgbouncer:
        condition: service_started
      redis:
        condition: service_healthy
    networks:
      - chatbot-network
    environment:
      DATABASE_URL: postgres://chatbot_user:${POSTGRES_PASSWORD}@pgbouncer:6432/chatbot?sslmode=disable
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      WORKER_CONCURRENCY: 4
      WORKER_QUEUES: "default,ingestion,embeddings"
    volumes:
      - logs:/app/logs
    deploy:
      resources:
        limits:
          cpus: '2.0'  # Workers need more CPU for PDF processing
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    command: ["dramatiq", "worker", "--processes", "4", "--threads", "2"]

  # ============================================
  # EXPORTERS (For Prometheus)
  # ============================================
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    container_name: chatbot-postgres-exporter
    restart: unless-stopped
    networks:
      - chatbot-network
    environment:
      DATA_SOURCE_URI: "postgres:5432/chatbot?sslmode=disable"
      DATA_SOURCE_USER: "chatbot_user"
      DATA_SOURCE_PASS: "${POSTGRES_PASSWORD}"
    depends_on:
      - postgres

  redis-exporter:
    image: oliver006/redis_exporter
    container_name: chatbot-redis-exporter
    restart: unless-stopped
    networks:
      - chatbot-network
    environment:
      REDIS_ADDR: "redis://:${REDIS_PASSWORD}@redis:6379"
    depends_on:
      - redis

  # ============================================
  # METRICS & MONITORING (Prometheus + Grafana)
  # ============================================
  prometheus:
    image: prom/prometheus:latest
    container_name: chatbot-prometheus
    restart: unless-stopped
    networks:
      - chatbot-network
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: chatbot-grafana
    restart: unless-stopped
    depends_on:
      - prometheus
    networks:
      - chatbot-network
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: "grafana-piechart-panel"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "127.0.0.1:3000:3000"

  # ============================================
  # NGINX (Load balancer and SSL termination)
  # ============================================
  nginx:
    image: nginx:alpine
    container_name: chatbot-nginx
    restart: unless-stopped
    depends_on:
      - api
    networks:
      - chatbot-network
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl:ro
      - logs:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### **Dockerfile for API:**
```dockerfile
# Dockerfile.api
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Create virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN uv venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install dependencies
WORKDIR /app
COPY pyproject.toml .
RUN uv pip install .

# Production stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN useradd -m -u 1000 chatbot
USER chatbot
WORKDIR /app

# Copy application code
COPY --chown=chatbot:chatbot . .

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### **Dockerfile for Workers:**
```dockerfile
# Dockerfile.worker
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Create virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN uv venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install dependencies
WORKDIR /app
COPY pyproject.toml .
RUN uv pip install .

# Production stage
FROM python:3.11-slim

# Install system dependencies for PDF processing
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libmagic1 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN useradd -m -u 1000 worker
USER worker
WORKDIR /app

# Copy application code
COPY --chown=worker:worker . .

# Run worker
CMD ["dramatiq", "worker", "app.worker.tasks", "--processes", "4", "--threads", "2"]
```

### **Nginx Configuration:**
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=widget:10m rate=1000r/m;

    # Upstream API servers
    upstream api_backend {
        least_conn;
        server api:8000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTP server (redirect to HTTPS)
    server {
        listen 80;
        listen [::]:80;
        server_name api.chatbot.com widget.chatbot.com;
        
        # Redirect to HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
        
        # Let's Encrypt challenge
        location /.well-known/acme-challenge/ {
            root /var/www/html;
        }
    }

    # HTTPS server - API
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name api.chatbot.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/api.chatbot.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/api.chatbot.com/privkey.pem;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        # Proxy to API
        location / {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check endpoint (no rate limiting)
        location /health {
            access_log off;
            limit_req off;
            proxy_pass http://api_backend/health;
        }

        # Metrics endpoint (internal only)
        location /metrics {
            allow 127.0.0.1;
            allow 10.0.0.0/8;
            deny all;
            proxy_pass http://api_backend/metrics;
        }
    }

    # HTTPS server - Widget
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name widget.chatbot.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/widget.chatbot.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/widget.chatbot.com/privkey.pem;

        # Security headers for iframe
        # CSP must be generated from project.allowed_origins
        # Example only (do not use '*' in production)
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self' https://example.com;" always;
        add_header X-Content-Type-Options "nosniff" always;

        # Rate limiting
        limit_req zone=widget burst=100 nodelay;

        # Serve static widget files
        location / {
            root /var/www/widget;
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Widget API proxy
        location /api/ {
            proxy_pass http://api_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### **PostgreSQL Configuration:**
```conf
# postgres.conf
# Performance tuning for pgvector
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 32MB
maintenance_work_mem = 256MB

# Connection settings
max_connections = 200
superuser_reserved_connections = 3

# Write-ahead log
wal_level = replica
fsync = on
synchronous_commit = off
full_page_writes = on
wal_buffers = 16MB
checkpoint_timeout = 10min
max_wal_size = 4GB
min_wal_size = 1GB

# Query planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
```

### **Prometheus Configuration:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'chatbot-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
      
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
      
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## **🚀 DEPLOYMENT SCRIPTS**

### **Initial Setup Script:**
```bash
#!/bin/bash
# setup-server.sh
set -e

echo "🚀 Setting up Chatbot Platform..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Create directory structure
mkdir -p /opt/chatbot/{config,ssl,logs,backups}
cd /opt/chatbot

# Create environment file
cat > .env.production << EOF
# Generated on $(date)
DATABASE_URL=postgresql://chatbot_user:$(openssl rand -base64 24)@localhost:5432/chatbot
REDIS_PASSWORD=$(openssl rand -base64 24)
ENCRYPTION_MASTER_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
# ... add other variables
EOF

echo "✅ Setup complete! Next steps:"
echo "1. Edit /opt/chatbot/.env.production"
echo "2. Copy docker-compose.yml to /opt/chatbot/"
echo "3. Run: docker compose up -d"
```

### **Deployment Script:**
```bash
#!/bin/bash
# deploy.sh
set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.$ENVIRONMENT.yml"
PROJECT_DIR="/opt/chatbot"

cd $PROJECT_DIR

echo "🚀 Deploying Chatbot Platform ($ENVIRONMENT)..."

# Pull latest images
docker compose -f $COMPOSE_FILE pull

# Stop existing containers
docker compose -f $COMPOSE_FILE down --timeout 30

# Run migrations
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running database migrations..."
    docker compose -f $COMPOSE_FILE run --rm api \
        alembic upgrade head
fi

# Start new containers
docker compose -f $COMPOSE_FILE up -d --remove-orphans

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.chatbot.com/health)
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed (HTTP $HTTP_STATUS)"
    exit 1
fi

# Clean up old images
docker image prune -f

echo "Deployment completed at $(date)"
```

### **Backup Script:**
```bash
#!/bin/bash
# backup.sh
set -e

BACKUP_DIR="/opt/chatbot/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "📦 Starting backup..."

# Backup database
docker exec chatbot-postgres pg_dump -U chatbot_user -d chatbot > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    aws s3 cp "$BACKUP_FILE.gz" s3://chatbot-backups/
fi

# Keep only last 7 days of local backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

### **Monitoring Script:**
```bash
#!/bin/bash
# monitor.sh
set -e

echo "📊 System Status:"
echo "-----------------"

# Docker status
echo "Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Resource usage
echo -e "\nResource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# API health
echo -e "\nAPI Health:"
curl -s https://api.chatbot.com/health | jq .

# Queue status
echo -e "\nQueue Status:"
docker exec chatbot-redis redis-cli -a $REDIS_PASSWORD LLEN dramatiq:default

# Database connections
echo -e "\nDatabase Connections:"
docker exec chatbot-postgres psql -U chatbot_user -d chatbot -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## **☁️ CLOUD DEPLOYMENT**

### **Option 1: DigitalOcean (Simplest)**
```bash
# 1. Create Droplet
doctl compute droplet create chatbot-server \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --ssh-keys <your-ssh-key-id>

# 2. Deploy using our scripts
scp -r deployment/ user@droplet_ip:/opt/chatbot
ssh user@droplet_ip "cd /opt/chatbot && bash setup-server.sh"
```

### **Option 2: AWS EC2**
```bash
# 1. Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name chatbot-key \
  --security-group-ids sg-123456 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=chatbot}]'

# 2. Attach Elastic IP
aws ec2 associate-address --instance-id i-123456 --public-ip 1.2.3.4
```

### **Option 3: Managed PostgreSQL (Recommended)**

**Neon.tech (Serverless Postgres with pgvector):**
```bash
# 1. Create project in Neon
# 2. Get connection string
# 3. Update DATABASE_URL in .env.production
DATABASE_URL="postgresql://user:pass@ep-cool-bird-123456.us-east-2.aws.neon.tech/chatbot?sslmode=require"
```

**Supabase:**
- Includes PostgreSQL, Auth, Storage
- Free tier up to 500MB database

### **Option 4: Managed Redis**
**Upstash (Serverless Redis):**
```bash
# 1. Create database in Upstash
# 2. Get connection string
REDIS_URL="redis://:password@global-cool-bird-12345.upstash.io:6379/0"
```

---

## **🔒 SECURITY HARDENING**

### **Firewall Configuration (UFW):**
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS (for Nginx)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Docker internal (block external)
sudo ufw deny 5432/tcp comment 'PostgreSQL'
sudo ufw deny 6379/tcp comment 'Redis'
sudo ufw deny 8000/tcp comment 'FastAPI'

# Enable firewall
sudo ufw enable
```

### **SSL Certificates (Let's Encrypt):**
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx \
  -d api.chatbot.com \
  -d widget.chatbot.com \
  --email admin@chatbot.com \
  --agree-tos \
  --no-eff-email

# Auto-renewal
sudo certbot renew --dry-run
```

### **Security Headers:**
Add to Nginx configuration:
```nginx
# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self';" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### **Docker Security:**
```bash
# Run as non-root user in containers
docker run --user 1000:1000 myapp

# Read-only root filesystem
docker run --read-only myapp

# No new privileges
docker run --security-opt no-new-privileges myapp

# Drop capabilities
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myapp
```

---

## **📈 SCALING STRATEGY**

### **Vertical Scaling (First):**
```yaml
# Increase resources in docker-compose
api:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G

worker:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
```

### **Horizontal Scaling (Add more instances):**
```bash
# Add more API servers
docker-compose scale api=3

# Add more workers
docker-compose scale worker=4
```

### **Database Scaling:**
- **Add Read Replicas:** For read-heavy workloads
- **Connection Pooling:** PgBouncer (already configured)
- **Query Optimization:** Indexes, query tuning
- **Partitioning:** For chunks table > 10M rows

### **When to Scale:**
| Metric | Threshold | Action |
|--------|-----------|--------|
| **CPU Usage** | > 70% sustained | Add more instances |
| **Memory Usage** | > 80% | Increase memory or instances |
| **Response Time** | P95 > 1000ms | Optimize or scale |
| **Database Connections** | > 150 active | Add read replica |
| **Queue Depth** | > 1000 items | Add more workers |

---

## **🔄 CI/CD PIPELINE**

### **GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: docker-compose -f docker-compose.test.yml run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/chatbot
            git pull origin main
            ./deploy.sh production
```

---

## **🚨 DISASTER RECOVERY**

### **Recovery Procedures:**

**1. Database Corruption:**
```bash
# Restore from backup
docker stop chatbot-postgres
docker run --rm -v chatbot_postgres_data:/var/lib/postgresql/data -v /backup:/backup alpine \
    sh -c "rm -rf /var/lib/postgresql/data/* && tar -xzf /backup/latest.tar.gz -C /var/lib/postgresql/data"
docker start chatbot-postgres
```

**2. Data Loss:**
```bash
# Re-ingest all sources
curl -X POST https://api.chatbot.com/admin/projects/{id}/reindex \
  -H "X-API-Key: admin-key"
```

**3. Complete Server Failure:**
```bash
# 1. Launch new VPS
# 2. Run setup-server.sh
# 3. Restore database from S3 backup
# 4. Update DNS
# 5. Run deploy.sh
```

### **Backup Schedule:**
- **Database:** Hourly (keep 24), Daily (keep 7), Weekly (keep 4)
- **File Storage:** Daily incremental, Weekly full
- **Configuration:** Version controlled in Git
- **Secrets:** Stored in password manager + encrypted backup

---

## **📊 MONITORING DASHBOARDS**

### **Grafana Dashboards to Create:**
- **System Health:** CPU, Memory, Disk, Network
- **API Performance:** Request rate, latency, error rate
- **Database:** Connections, queries, replication lag
- **Redis:** Memory usage, hit rate, connections
- **Business Metrics:** Active projects, queries, token usage
- **Retrieval Quality:** Precision@k, recall@k, latency

### **Alerting Rules:**
```yaml
# alert_rules.yml
groups:
  - name: chatbot_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
```

---

## **✅ DEPLOYMENT CHECKLIST**

### **Pre-Deployment:**
- [ ] Domain registered and DNS configured
- [ ] SSL certificates obtained
- [ ] Environment variables set
- [ ] Database initialized with schema
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Firewall configured

### **Post-Deployment:**
- [ ] API endpoints accessible
- [ ] Widget loads correctly
- [ ] File upload works
- [ ] Chat responses generated
- [ ] Background jobs processing
- [ ] Metrics collecting
- [ ] Alerts tested
- [ ] Backup restored (test)

### **Ongoing:**
- [ ] Logs monitored daily
- [ ] Backups verified weekly
- [ ] Security updates applied monthly
- [ ] Performance reviewed quarterly

---

## **📞 SUPPORT & MAINTENANCE**

### **Regular Maintenance Tasks:**
```bash
# Daily
./monitor.sh
docker system prune -f

# Weekly
./backup.sh
docker image prune -a -f
docker volume prune -f

# Monthly
certbot renew
apt-get update && apt-get upgrade
docker-compose pull
```

### **Troubleshooting Commands:**
```bash
# Check logs
docker logs chatbot-api --tail 100 -f
docker logs chatbot-worker --tail 100 -f

# Check database
docker exec chatbot-postgres psql -U chatbot_user -d chatbot -c "SELECT * FROM pg_stat_activity;"

# Check Redis
docker exec chatbot-redis redis-cli -a $REDIS_PASSWORD INFO

# Restart services
docker-compose restart api worker

# Scale workers
docker-compose up -d --scale worker=4
```
