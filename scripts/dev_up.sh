#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
REBUILD=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --build) REBUILD=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo "Starting Docker services (Redis)..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d redis

cleanup() {
  echo "Stopping Docker services..."
  docker-compose -f "$ROOT_DIR/docker-compose.yml" stop
}

trap cleanup EXIT

FRONTEND_DIR="$ROOT_DIR/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

echo "API: http://localhost:8001"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop the frontend dev server."

# Kill previous background backend if running
pkill -f "uvicorn app.main:app" || true

# Start backend in background locally (avoiding Docker rebuild issues)
echo "Starting Backend locally..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

cleanup() {
  echo "Stopping services..."
  kill $BACKEND_PID || true
  docker-compose -f "$ROOT_DIR/docker-compose.yml" stop
}

(cd "$FRONTEND_DIR" && pnpm run dev)
