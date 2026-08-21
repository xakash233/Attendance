#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';
const pm2 = 'npx pm2';

execSync(`${pm2} startup`, { cwd: backendRoot, stdio: 'inherit' });
execSync(`${pm2} save`, { cwd: backendRoot, stdio: 'inherit' });

console.log('[bridge:boot] PM2 boot autostart configured.');
if (isWindows) {
    console.log('[bridge:boot] If PM2 printed an admin command, run it once in PowerShell as Administrator.');
} else {
    console.log('[bridge:boot] If PM2 printed a sudo command, run it once, then run npm run bridge:boot again.');
}
