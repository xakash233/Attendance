#!/usr/bin/env bash
# ==============================================================================
# Deploy Backend to VPS (Dedicated Server for PM2 / Socket.io / ADMS Push)
# Target: hrms.tectratechnologies.com (157.173.218.57)
# ==============================================================================
set -e

VPS_IP="${VPS_IP:-157.173.218.57}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/root/Attendance}"

echo "================================================================================"
echo "🚀 Triggering Backend Deployment on VPS ($VPS_USER@$VPS_IP)..."
echo "================================================================================"

if command -v ssh >/dev/null 2>&1; then
  echo "Connecting via SSH..."
  ssh -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "cd $VPS_PATH && git pull && bash scripts/deploy-backend-vps.sh"
else
  echo "SSH command not found or not configured in current shell."
  echo "Please SSH into the VPS and execute:"
  echo "   ssh $VPS_USER@$VPS_IP"
  echo "   cd $VPS_PATH && git pull && bash scripts/deploy-backend-vps.sh"
fi
