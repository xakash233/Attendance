#!/usr/bin/env bash
# Run ON THE VPS to make eSSL WiFi sync work without a laptop bridge.
# 1) Ensures nginx proxies /iclock on HTTPS and HTTP (port 80)
# 2) Reloads nginx + restarts attendance-backend
# 3) Resets ADMS stamp so the device re-uploads punches
set -euo pipefail

NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/hrms.tectratechnologies.com}"
BACKEND_DIR="${BACKEND_DIR:-/root/backend}"

if [ ! -f "$NGINX_CONF" ]; then
  echo "Nginx config not found: $NGINX_CONF"
  exit 1
fi

if ! grep -q 'location ^~ /iclock/' "$NGINX_CONF"; then
  echo "ERROR: /iclock/ location missing in $NGINX_CONF"
  echo "Add this inside the HTTPS server block BEFORE location / :"
  cat <<'BLOCK'
    location ^~ /iclock/ {
        proxy_pass http://127.0.0.1:5001/iclock/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
BLOCK
  exit 1
fi

# Ensure HTTP (port 80) also serves /iclock instead of only redirecting to HTTPS.
# eSSL devices are much more reliable on HTTP:80 than HTTPS:443.
if grep -q 'listen 80' "$NGINX_CONF" && ! grep -A20 'listen 80' "$NGINX_CONF" | grep -q 'location ^~ /iclock/'; then
  python3 - <<'PY'
from pathlib import Path
path = Path(__import__('os').environ.get('NGINX_CONF', '/etc/nginx/sites-enabled/hrms.tectratechnologies.com'))
text = path.read_text()
block = '''
    location ^~ /iclock/ {
        proxy_pass http://127.0.0.1:5001/iclock/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
'''
# Insert /iclock into the first port-80 server block, before return 301 if present
import re
def inject(match):
    body = match.group(0)
    if 'location ^~ /iclock/' in body:
        return body
    if 'return 301' in body:
        return body.replace('return 301', block + '\n    return 301', 1)
    return body[:-1] + block + '\n}'

new_text, n = re.subn(
    r'server\s*\{[^{}]*listen\s+80;.*?\}',
    inject,
    text,
    count=1,
    flags=re.S
)
if n:
    path.write_text(new_text)
    print('Injected /iclock/ into HTTP (port 80) server block')
else:
    print('Could not auto-edit HTTP server block — edit manually if needed')
PY
fi

nginx -t
systemctl reload nginx

if [ -d "$BACKEND_DIR" ]; then
  cd "$BACKEND_DIR"
  pm2 restart attendance-backend || true
fi

echo
echo "Verify:"
echo "  curl -s 'http://hrms.tectratechnologies.com/iclock/cdata?SN=JJA1251201425&options=all' | head -3"
echo
echo "Device settings (no laptop):"
echo "  Server Mode = ADMS"
echo "  Domain Name = ON"
echo "  Server Address = hrms.tectratechnologies.com"
echo "  Server Port = 80"
echo "  Proxy = OFF"
echo "Then reboot device and punch once."
echo
echo "Watch: pm2 logs attendance-backend --lines 50 | grep ADMS"
