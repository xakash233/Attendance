#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[bridge:boot] PM2 not found globally. Using npx pm2..."
  PM2="npx pm2"
else
  PM2="pm2"
fi

$PM2 startup
$PM2 save

echo "[bridge:boot] PM2 boot autostart configured."
echo "[bridge:boot] If prompted above, run the sudo command PM2 printed, then run: npm run bridge:boot"
