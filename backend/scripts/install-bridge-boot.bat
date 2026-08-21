@echo off
setlocal
cd /d "%~dp0\.."

where pm2 >nul 2>nul
if %errorlevel% neq 0 (
  echo [bridge:boot] PM2 not found globally. Install with: npm install -g pm2
  echo [bridge:boot] Or run: npx pm2 startup
  npx pm2 startup
  npx pm2 save
) else (
  pm2 startup
  pm2 save
)

echo [bridge:boot] PM2 boot autostart configured.
echo [bridge:boot] Run the command PM2 printed above if this is the first setup.
