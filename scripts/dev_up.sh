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

echo "Starting Docker services..."
DOCKER_OPTS="-d"
if [ "$REBUILD" = true ]; then
  DOCKER_OPTS="$DOCKER_OPTS --build --force-recreate"
fi

docker-compose -f "$ROOT_DIR/docker-compose.yml" up $DOCKER_OPTS redis api worker

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

if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ "$REBUILD" = true ]; then
  echo "Ensuring frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "API: http://localhost:8001"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop the frontend dev server."

(cd "$FRONTEND_DIR" && npm run dev)
