# Docker Deployment

Deploy using Docker Compose for local development.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

```bash
# Clone the repository
git clone https://github.com/example/rag-prod.git
cd rag-prod

# Create environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| api | 8000 | FastAPI server |
| worker | - | Background workers |
| postgres | 5432 | Database |
| redis | 6379 | Cache/Queue |

## Development Mode

```bash
# Start with hot reload
docker-compose up

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api alembic upgrade head
```

## Production Mode

```bash
# Use production compose file
docker-compose -f docker-compose.production.yml up -d

# Scale workers
docker-compose -f docker-compose.production.yml up -d --scale worker=4
```

## Environment Variables

Set required variables in `.env`:

```bash
DATABASE_URL="postgresql://user:pass@postgres:5432/db"
REDIS_URL="redis://redis:6379/0"
JWT_SECRET="your-secret-key"
```

## Volume Mounts

- `./logs` - Application logs
- `./data` - Local data (if needed)

## Networking

Services communicate on internal network:

```
api → postgres
api → redis
worker → postgres  
worker → redis
```

## Common Commands

```bash
# Restart a service
docker-compose restart api

# Rebuild after code changes
docker-compose build api
docker-compose up -d api

# View logs
docker-compose logs -f

# Stop all
docker-compose down
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs api

# Common issues:
# - Missing env vars
# - Port already in use
# - Database not ready
```

### Database connection errors

```bash
# Wait for postgres
docker-compose up -d postgres
sleep 10

# Run migrations
docker-compose exec api alembic upgrade head
```

### Permission issues

```bash
# Fix volume permissions
sudo chown -R $USER:$USER .
```
