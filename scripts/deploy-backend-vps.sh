#!/usr/bin/env bash
# ==============================================================================
# Run ON THE VPS SERVER after git pull to reload backend with ESSL WiFi routes.
# Usage:
#   cd /root/Attendance && git pull && bash scripts/deploy-backend-vps.sh
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

echo "[deploy 1/4] Installing backend dependencies..."
npm ci --omit=dev

echo "[deploy 2/4] Generating Prisma client & synchronizing schema..."
npx prisma generate
npx prisma db push --skip-generate

if command -v docker >/dev/null 2>&1 && { [ -f "$ROOT/backend/docker-compose.yml" ] || [ -f "$ROOT/docker-compose.yml" ]; }; then
  COMPOSE_FILE="$ROOT/backend/docker-compose.yml"
  if [ ! -f "$COMPOSE_FILE" ] && [ -f "$ROOT/docker-compose.yml" ]; then
    COMPOSE_FILE="$ROOT/docker-compose.yml"
  fi
  echo "[deploy 3/4] Rebuilding Docker backend..."
  docker compose -f "$COMPOSE_FILE" up -d --build backend
else
  echo "[deploy 3/4] Restarting PM2 backend process..."
  pm2 restart attendance-api --update-env || \
  pm2 restart attendance-backend --update-env || \
  pm2 start ecosystem.config.cjs --only attendance-api

  pm2 save || true
fi

echo "[deploy 4/4] Verifying local ADMS endpoint health..."
sleep 2
if curl -s -f "http://127.0.0.1:5001/api/biometric/adms/ping" >/dev/null 2>&1; then
  echo "✅ Local ADMS ping succeeded on 127.0.0.1:5001"
else
  echo "⚠️ Warning: Local ADMS ping returned error. Check logs: pm2 logs attendance-api --lines 20"
fi

echo "========================================================"
echo "🚀 Backend deployment complete!"
echo "Public ADMS Check: curl -I http://157.173.218.57/iclock/cdata?options=all"
echo "Public API Check : curl -I https://hrms.tectratechnologies.com/api/biometric/adms/ping"
echo "========================================================"
