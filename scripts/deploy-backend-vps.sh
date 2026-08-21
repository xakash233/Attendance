#!/usr/bin/env bash
# Run ON THE PRODUCTION SERVER (VPS) after git pull to reload backend with ESSL WiFi routes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

echo "[deploy] Installing dependencies..."
npm ci --omit=dev

echo "[deploy] Updating database schema..."
npx prisma generate
npx prisma db push --skip-generate

if command -v docker >/dev/null 2>&1 && [ -f "$ROOT/backend/docker-compose.yml" ] || [ -f "$ROOT/docker-compose.yml" ]; then
  COMPOSE_FILE="$ROOT/backend/docker-compose.yml"
  if [ ! -f "$COMPOSE_FILE" ] && [ -f "$ROOT/docker-compose.yml" ]; then
    COMPOSE_FILE="$ROOT/docker-compose.yml"
  fi
  echo "[deploy] Rebuilding Docker backend..."
  docker compose -f "$COMPOSE_FILE" up -d --build backend
else
  echo "[deploy] Restarting PM2 backend..."
  pm2 restart attendance-api || pm2 start ecosystem.config.cjs --only attendance-api
fi

echo "[deploy] Done. Verify: curl https://hrms.tectratechnologies.com/api/biometric/adms/ping"
