#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/huao/app}
export ENV_FILE=${ENV_FILE:-/opt/huao/config/env/production.env}
export STORAGE_ROOT=${STORAGE_ROOT:-/opt/huao/storage}
export POSTGRES_DATA_ROOT=${POSTGRES_DATA_ROOT:-/opt/huao/postgres/data}
export CADDYFILE_PATH=${CADDYFILE_PATH:-/opt/huao/config/caddy/Caddyfile}
COMPOSE="docker compose --profile prod"

cd "$APP_DIR"

echo "[deploy] Fetching latest code..."
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  git checkout main
fi
git pull --ff-only origin main

echo "[deploy] Building app image..."
$COMPOSE build app

echo "[deploy] Applying database migrations..."
$COMPOSE run --rm app npx prisma migrate deploy

echo "[deploy] Restarting stack..."
$COMPOSE up -d --remove-orphans

echo "[deploy] Cleaning dangling images..."
docker image prune -f >/dev/null || true

echo "Deployment finished."
