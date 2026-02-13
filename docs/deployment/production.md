# Production Deployment

Production deployment guide with security hardening.

## Architecture

```
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
```

## Prerequisites

### Infrastructure

- **VPS**: 4GB RAM, 2 vCPU (minimum)
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis
- **Storage**: S3-compatible (R2, S3)

### Domain & SSL

1. Register domain
2. Set up Cloudflare
3. Obtain SSL certificates

## Environment Setup

### 1. Server Setup

```bash
# SSH to server
ssh user@your-server

# Create project directory
sudo mkdir -p /opt/chatbot
cd /opt/chatbot

# Clone repository
git clone https://github.com/example/rag-prod.git .
```

### 2. Environment Variables

Create `/.env.production`:

```bash
# Required
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
REDIS_URL="redis://:pass@host:6379/0"
JWT_SECRET="$(openssl rand -base64 32)"

# AI Services
AZURE_OPENAI_API_KEY="your-key"
AZURE_OPENAI_ENDPOINT="https://resource.openai.azure.com/"
AZURE_DEPLOYMENT_NAME="gpt-4"
AZURE_EMBEDDING_DEPLOYMENT_NAME="text-embedding-3-small"

# Storage
S3_ENDPOINT="https://r2.cloudflarestorage.com"
S3_BUCKET="chatbot-files"
S3_ACCESS_KEY_ID="key"
S3_SECRET_ACCESS_KEY="secret"

# Production settings
ENVIRONMENT="production"
LOG_LEVEL="INFO"
CORS_ORIGINS="https://yourdomain.com"
```

### 3. SSL Certificates

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com -d widget.yourdomain.com
```

## Docker Deployment

### Build Images

```bash
# Build API image
docker build -f Dockerfile.api -t chatbot-api:latest .

# Build worker image  
docker build -f Dockerfile.worker -t chatbot-worker:latest .
```

### Run Containers

```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker ps
```

## Nginx Configuration

### SSL Termination

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Security Headers

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
```

## Database Setup

### Initialize Schema

```bash
# Run migrations
docker-compose exec api alembic upgrade head

# Seed initial data (if needed)
docker-compose exec api python -m app.seed
```

## Monitoring

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/health

# Readiness
curl https://api.yourdomain.com/health/ready
```

### Logs

```bash
# View logs
docker logs chatbot-api --tail 100 -f

# Search logs
docker logs chatbot-api 2>&1 | grep ERROR
```

## Scaling

### Horizontal Scaling

```bash
# Add more API instances
docker-compose up -d --scale api=3

# Add more workers
docker-compose up -d --scale worker=4
```

### Database Scaling

- Use managed PostgreSQL (Neon, Supabase)
- Add read replicas for heavy read loads
- Use PgBouncer for connection pooling

## Backups

### Database Backup

```bash
# Daily backup script
#!/bin/bash
docker exec chatbot-postgres pg_dump -U user dbname > backup_$(date +%Y%m%d).sql
```

### S3 Backup

Enable versioning on S3 bucket.

## Security Hardening

### Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Updates

```bash
# Update regularly
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose pull
docker-compose up -d
```

## CI/CD

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/chatbot
            docker-compose pull
            docker-compose up -d
```

## Checklist

- [ ] Domain configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Firewall configured

## Troubleshooting

### 502 Bad Gateway

- Check API is running: `docker ps`
- Check logs: `docker logs chatbot-api`
- Verify port: `netstat -tlnp | grep 8000`

### High Latency

- Check worker queue: `docker exec chatbot-redis redis-cli LLEN dramatiq:default`
- Scale workers: `docker-compose up -d --scale worker=4`
- Check database connections
