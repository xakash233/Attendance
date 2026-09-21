#!/usr/bin/env bash
# Run ON the VPS as root. Makes eSSL push punches over WiFi directly to this server.
# No office laptop / bridge required.
set -euo pipefail

BACKEND_DIR="${BACKEND_DIR:-/root/backend}"
cd "$BACKEND_DIR"

echo "[1/5] Opening firewall for eSSL ADMS (port 5001)..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow 5001/tcp || true
  ufw status | grep -E '5001|Status' || true
else
  echo "ufw not found — open TCP 5001 in your cloud panel / iptables if needed."
fi

echo "[2/5] Writing ADMS WiFi env (IP direct, no laptop)..."
touch .env
grep -q '^ADMS_SERVER_HOST=' .env 2>/dev/null && sed -i 's/^ADMS_SERVER_HOST=.*/ADMS_SERVER_HOST=157.173.218.57/' .env || echo 'ADMS_SERVER_HOST=157.173.218.57' >> .env
grep -q '^ADMS_SERVER_PORT=' .env 2>/dev/null && sed -i 's/^ADMS_SERVER_PORT=.*/ADMS_SERVER_PORT=5001/' .env || echo 'ADMS_SERVER_PORT=5001' >> .env
grep -q '^ADMS_PUSH_PATH=' .env 2>/dev/null && sed -i 's|^ADMS_PUSH_PATH=.*|ADMS_PUSH_PATH=/iclock/cdata|' .env || echo 'ADMS_PUSH_PATH=/iclock/cdata' >> .env
grep -q '^ADMS_USE_HTTPS=' .env 2>/dev/null && sed -i 's/^ADMS_USE_HTTPS=.*/ADMS_USE_HTTPS=false/' .env || echo 'ADMS_USE_HTTPS=false' >> .env
grep -q '^ADMS_USE_IP=' .env 2>/dev/null && sed -i 's/^ADMS_USE_IP=.*/ADMS_USE_IP=true/' .env || echo 'ADMS_USE_IP=true' >> .env

echo "[3/5] Resetting ADMS stamp so device re-uploads punches..."
node --input-type=module <<'EOF'
import prisma from './src/config/prisma.js';
const r = await prisma.admsDevice.updateMany({
  data: { attlogStamp: 0, lastPushAt: null }
});
console.log('ATTLOGStamp reset for', r.count, 'device(s)');
await prisma.$disconnect();
EOF

echo "[4/5] Restarting backend..."
pm2 restart attendance-backend --update-env
sleep 2

echo "[5/5] Verifying ADMS endpoint..."
curl -s "http://127.0.0.1:5001/iclock/cdata?SN=JJA1251201425&options=all" | head -5
echo
curl -s "http://157.173.218.57:5001/iclock/cdata?SN=JJA1251201425&options=all" | head -5 || echo "PUBLIC :5001 still blocked — check cloud firewall / security group"

cat <<'MSG'

========================================
DEVICE SETTINGS (no laptop)
========================================
Server Mode          : ADMS
Enable Domain Name   : OFF
Server Address       : 157.173.218.57
Enable Proxy Server  : OFF
Server Port          : 5001

Then: Save → Reboot device → Punch once

On YOUR LAPTOP (stop the middleman):
  pm2 stop biometric-bridge
  # or close the terminal running biometric-local-bridge.mjs

Watch on VPS:
  pm2 logs attendance-backend --lines 50 | grep ADMS

Good log lines:
  [ADMS] Init config for SN:JJA1251201425
  [ADMS] SN:JJA1251201425 uploaded N ATTLOG record(s)
========================================
MSG
