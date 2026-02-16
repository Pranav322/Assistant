#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
FRONTEND_DIR="$ROOT_DIR/../frontend"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }
error() { echo -e "${RED}[dev]${NC} $1"; }

# Check if ROOT_DIR exists
if [ ! -d "$ROOT_DIR" ]; then
    error "Backend directory not found at $ROOT_DIR"
    exit 1
fi

# Change to ROOT_DIR to ensure all backend commands run correctly
cd "$ROOT_DIR" || exit 1

# ── 1. Ensure Docker is running ─────────────────────────────
if ! docker info &>/dev/null; then
  log "Docker is not running."
  if [[ "$OSTYPE" == "darwin"* ]]; then
      log "Starting Docker Desktop..."
      open -a Docker
  else
      warn "Please start Docker manually."
  fi

  printf "  Waiting for Docker"
  while ! docker info &>/dev/null; do
    printf "."
    sleep 2
  done
  echo ""
  log "Docker is ready."
fi

# ── 2. Start Redis via docker-compose ───────────────────────
log "Starting Redis..."
docker-compose -f "docker-compose.yml" up -d redis 2>&1 | grep -v "version.*obsolete" || true

# Wait until Redis is actually accepting connections
printf "  Waiting for Redis"
until docker exec chatbot-redis redis-cli ping &>/dev/null; do
  printf "."
  sleep 1
done
echo ""
log "Redis is ready on localhost:6379."

# ── 3. Kill any stale backend processes ─────────────────────
pkill -f "uvicorn app.main:app" 2>/dev/null || true

# ── 4. Cleanup on exit (Ctrl+C) ────────────────────────────
BACKEND_PID=""
cleanup() {
  echo ""
  log "Shutting down..."
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  docker-compose -f "docker-compose.yml" stop 2>&1 | grep -v "version.*obsolete" || true
  log "Done."
}
trap cleanup EXIT

# ── 5. Start backend ───────────────────────────────────────
log "Starting backend on http://localhost:8001 ..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# Give backend a moment to boot
sleep 2

# ── 6. Start frontend (foreground — Ctrl+C stops everything)
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  API:      http://localhost:8001${NC}"
echo -e "${CYAN}  Frontend: http://localhost:3000${NC}"
echo -e "${CYAN}  Press Ctrl+C to stop everything.${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$FRONTEND_DIR" && pnpm run dev
