#!/usr/bin/env node
/**
 * Push bridge sync secret to Vercel production (requires Vercel CLI login).
 *   npm run bridge:vercel-env
 */
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const secret = process.env.BIOMETRIC_SYNC_SECRET || 'sync-all-records-2026';

const hasVercel = spawnSync('vercel', ['--version'], { stdio: 'ignore' }).status === 0;
if (!hasVercel) {
    console.error('[bridge:vercel-env] Vercel CLI not found. Install: npm i -g vercel');
    process.exit(1);
}

const envKeys = ['BIOMETRIC_SYNC_SECRET', 'CRON_SECRET'];
for (const key of envKeys) {
    try {
        execSync(`vercel env rm ${key} production -y`, { cwd: backendRoot, stdio: 'ignore' });
    } catch {
        // env may not exist yet
    }
    execSync(`printf '%s' '${secret}' | vercel env add ${key} production`, {
        cwd: backendRoot,
        stdio: 'inherit',
        shell: true
    });
    console.log(`[bridge:vercel-env] Set ${key} on Vercel production.`);
}

console.log('[bridge:vercel-env] Redeploy backend on Vercel for changes to take effect.');
