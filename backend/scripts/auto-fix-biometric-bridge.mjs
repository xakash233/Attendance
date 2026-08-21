#!/usr/bin/env node
/**
 * One-command auto-fix for ESSL biometric sync.
 *
 * Run on the office LAN PC (same network as the biometric device):
 *   npm run bridge:auto
 *
 * This script:
 *   1. Creates .env.bridge if missing
 *   2. Installs dependencies
 *   3. Auto-detects the eSSL device on the LAN
 *   4. Verifies cloud credentials
 *   5. Starts the bridge under PM2 with auto-restart
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import fsSync from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const envBridgePath = path.join(backendRoot, '.env.bridge');
const envExamplePath = path.join(backendRoot, '.env.bridge.example');

const log = (message) => console.log(`[auto-fix] ${message}`);
const warn = (message) => console.warn(`[auto-fix] ${message}`);
const fail = (message) => {
    console.error(`[auto-fix] ERROR: ${message}`);
    process.exit(1);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, options = {}) {
    execSync(command, {
        cwd: backendRoot,
        stdio: 'inherit',
        ...options
    });
}

function commandExists(name) {
    const result = spawnSync(name, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
}

async function ensureEnvFile() {
    if (fsSync.existsSync(envBridgePath)) {
        log(`Using existing ${path.basename(envBridgePath)}`);
        return;
    }

    if (!fsSync.existsSync(envExamplePath)) {
        fail(`Missing ${path.basename(envExamplePath)}`);
    }

    await fs.copyFile(envExamplePath, envBridgePath);
    log(`Created ${path.basename(envBridgePath)} from example`);
}

function loadBridgeEnv() {
    dotenv.config({ path: envBridgePath });
    return {
        deviceIp: process.env.BIOMETRIC_DEVICE_IP || '192.168.68.60',
        devicePort: parseInt(process.env.BIOMETRIC_DEVICE_PORT || '4370', 10),
        cloudApiUrl: process.env.CLOUD_API_URL || 'https://hrms.tectratechnologies.com/api/biometric/agent-sync',
        syncSecret: process.env.BIOMETRIC_SYNC_SECRET
            || process.env.SYNC_SECRET
            || process.env.CRON_SECRET
            || 'sync-all-records-2026'
    };
}

function probeHost(ip, port, timeoutMs = 700) {
    return new Promise((resolve) => {
        const socket = net.connect({ host: ip, port, timeout: timeoutMs });
        const finish = (result) => {
            socket.removeAllListeners();
            try { socket.destroy(); } catch { /* noop */ }
            resolve(result);
        };
        socket.on('connect', () => finish(true));
        socket.on('error', () => finish(false));
        socket.on('timeout', () => finish(false));
    });
}

function getLocalSubnets() {
    const subnets = new Set();
    for (const iface of Object.values(os.networkInterfaces())) {
        for (const addr of iface || []) {
            if (addr.family === 'IPv4' && !addr.internal) {
                const [a, b, c] = addr.address.split('.');
                subnets.add(`${a}.${b}.${c}`);
            }
        }
    }
    return [...subnets];
}

async function discoverDeviceIp(configuredIp, port) {
    const candidates = [
        configuredIp,
        '192.168.68.60',
        '192.168.1.2',
        '192.168.1.201',
        '192.168.0.201'
    ];

    for (const subnet of getLocalSubnets()) {
        for (let host = 1; host <= 254; host += 1) {
            candidates.push(`${subnet}.${host}`);
        }
    }

    const uniqueCandidates = [...new Set(candidates)];
    log(`Scanning LAN for eSSL device on port ${port} (${uniqueCandidates.length} hosts)...`);

    const batchSize = 32;
    for (let i = 0; i < uniqueCandidates.length; i += batchSize) {
        const batch = uniqueCandidates.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (ip) => ({
            ip,
            open: await probeHost(ip, port)
        })));
        const hit = results.find((entry) => entry.open);
        if (hit) {
            return hit.ip;
        }
    }

    return null;
}

async function updateEnvValue(key, value) {
    const raw = await fs.readFile(envBridgePath, 'utf8');
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    const nextLine = `${key}=${value}`;
    const updated = pattern.test(raw)
        ? raw.replace(pattern, nextLine)
        : `${raw.trimEnd()}\n${nextLine}\n`;
    await fs.writeFile(envBridgePath, updated, 'utf8');
}

async function verifyCloud(config) {
    const healthUrl = config.cloudApiUrl.replace(/\/agent-sync\/?$/, '/bridge-health');
    log(`Checking cloud bridge health at ${healthUrl}`);

    const response = await fetch(healthUrl, {
        headers: { 'x-sync-secret': config.syncSecret }
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        fail('Cloud rejected the sync secret. Set BIOMETRIC_SYNC_SECRET on Vercel to match .env.bridge.');
    }
    if (!response.ok || !data.ok) {
        fail(data.message || `Cloud health check failed (${response.status})`);
    }

    log(`Cloud OK. Bridge status: ${data.status || 'unknown'}. Last punch: ${data.lastPunchAt || 'none'}`);
}

async function ensureDependencies() {
    if (!fsSync.existsSync(path.join(backendRoot, 'node_modules'))) {
        log('Installing dependencies...');
        run('npm install');
    }
}

function startWithPm2() {
    const pm2Bin = commandExists('pm2') ? 'pm2' : 'npx pm2';
    log(`Starting bridge with ${pm2Bin} (auto-restart enabled)...`);

    run(`${pm2Bin} start ecosystem.config.cjs --only biometric-bridge --update-env`);
    run(`${pm2Bin} save`);

    log('Bridge is running.');
    log(`View logs: ${pm2Bin} logs biometric-bridge`);
    log(`Stop bridge: ${pm2Bin} stop biometric-bridge`);
    log('Enable boot autostart: npm run bridge:boot');
}

async function main() {
    log('Starting ESSL biometric auto-fix...');
    await ensureEnvFile();
    await ensureDependencies();

    let config = loadBridgeEnv();
    log(`Configured device IP: ${config.deviceIp}:${config.devicePort}`);

    if (await probeHost(config.deviceIp, config.devicePort)) {
        log(`Device reachable at ${config.deviceIp}:${config.devicePort}`);
    } else {
        warn(`Configured device ${config.deviceIp} is not reachable. Scanning LAN...`);
        const discovered = await discoverDeviceIp(config.deviceIp, config.devicePort);
        if (!discovered) {
            fail(`No eSSL device found on port ${config.devicePort}. Connect this PC to the office LAN and retry.`);
        }
        log(`Found device at ${discovered}`);
        await updateEnvValue('BIOMETRIC_DEVICE_IP', discovered);
        config = loadBridgeEnv();
    }

    await verifyCloud(config);
    startWithPm2();
}

main().catch((err) => fail(err.message || String(err)));
