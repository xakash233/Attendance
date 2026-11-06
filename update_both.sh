#!/usr/bin/env bash
# ==============================================================================
# Dual Deployment Script:
# - Pushes entire repository to Git (origin/main)
# - Deploys Frontend ONLY to Vercel
# - Instructs or triggers VPS reload for Backend (PM2 / eSSL ADMS)
# ==============================================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "[1/3] Staging and committing changes..."
git add .
COMMIT_MSG="${1:-chore: sync dual setup architecture and biometric pipeline}"
git commit -m "$COMMIT_MSG" || echo "No new changes to commit."

echo "[2/3] Pushing to Git repository (main)..."
git push origin main || echo "Git push skipped or up to date."

echo "[3/3] Deploying Frontend ONLY to Vercel..."
VERCEL_ORG_ID=team_X2f8zsWjkKOsLwvLhc2NSHsw \
VERCEL_PROJECT_ID=prj_N9v2T1v3U0UHTc6N7I5S9z6z0M2f \
npx vercel deploy --prod --yes --cwd frontend

cat <<'EOF'

================================================================================
✅ Frontend deployed to Vercel successfully!
================================================================================
👉 To update the VPS Backend (Node/PM2/ADMS), run on your VPS or via SSH:

   ssh root@157.173.218.57 "cd /root/Attendance && git pull && bash scripts/deploy-backend-vps.sh"

Or if you have SSH keys configured, run:
   ./deploy_backend.sh
================================================================================
EOF
