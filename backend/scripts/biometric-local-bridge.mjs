#!/usr/bin/env node
/**
 * Biometric Local Office Bridge Script
 *
 * Run this script on any desktop computer inside the office LAN (same network as the biometric machine).
 * It connects locally to the eSSL device, and pushes punches to the Cloud Backend API.
 *
 * How it works:
 *   1. FIRST RUN ONLY does the historical import (last SYNC_BACK_DAYS, default 30 days).
 *   2. It then saves a checkpoint - the newest punch timestamp it has already sent.
 *   3. After that it listens to the device's real-time punch stream and pushes each
 *      new punch the moment somebody scans. One record per punch, never 10,000 again.
 *   4. A periodic safety sweep re-reads the device log but only posts punches NEWER
 *      than the checkpoint (normally zero). This covers device reboots, dropped
 *      network links, or real-time events the device failed to emit.
 *
 * Delete the state file (see SYNC_STATE_FILE) if you ever need to force a re-import.
 *
 * Usage:
 *   node scripts/biometric-local-bridge.mjs
 *
 * Environment variables (optional):
 *   BIOMETRIC_DEVICE_IP=192.168.68.60
 *   BIOMETRIC_DEVICE_PORT=4370
 *   CLOUD_API_URL=https://hrms.tectratechnologies.com/api/biometric/agent-sync
 *   SYNC_SECRET=sync-all-records-2026   # or BIOMETRIC_SYNC_SECRET (must match cloud)
 *   SYNC_BACK_DAYS=30              # initial import window only. 0 = entire device history
 *   CHUNK_SIZE=100                 # records per POST during the initial import
 *   SWEEP_INTERVAL_MINUTES=5       # safety re-check of the device log
 *   SWEEP_OVERLAP_SECONDS=120      # re-send this much overlap; the server de-duplicates
 *   RECONNECT_DELAY_SECONDS=5
 *   DEVICE_TZ_OFFSET=+05:30        # timezone the device clock is set to
 *   SYNC_STATE_FILE=<repo>/backend/.biometric-sync-state.json
 */

import dotenv from 'dotenv';
import ZKLib from 'node-zklib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.bridge') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEVICE_IP = process.env.BIOMETRIC_DEVICE_IP || '192.168.68.60';
const DEVICE_PORT = parseInt(process.env.BIOMETRIC_DEVICE_PORT || '4370', 10);
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://hrms.tectratechnologies.com/api/biometric/agent-sync';
const CLOUD_HEALTH_URL = process.env.CLOUD_HEALTH_URL
    || CLOUD_API_URL.replace(/\/agent-sync\/?$/, '/bridge-health');
const SYNC_SECRET = process.env.BIOMETRIC_SYNC_SECRET
    || process.env.SYNC_SECRET
    || process.env.CRON_SECRET
    || 'sync-all-records-2026';

const SYNC_BACK_DAYS = parseInt(process.env.SYNC_BACK_DAYS || '30', 10);
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '100', 10);
const SWEEP_INTERVAL_MS = parseFloat(process.env.SWEEP_INTERVAL_MINUTES || '5') * 60 * 1000;
const SWEEP_OVERLAP_MS = parseInt(process.env.SWEEP_OVERLAP_SECONDS || '120', 10) * 1000;
const RECONNECT_DELAY_MS = parseInt(process.env.RECONNECT_DELAY_SECONDS || '5', 10) * 1000;
const CONNECT_TIMEOUT_MS = parseInt(process.env.CONNECT_TIMEOUT_SECONDS || '15', 10) * 1000;
const DEVICE_TZ_OFFSET = process.env.DEVICE_TZ_OFFSET || '+05:30';
const STATE_FILE = process.env.SYNC_STATE_FILE || path.join(__dirname, '..', '.biometric-sync-state.json');

function printBanner() {
    console.log('==================================================');
    console.log('      Tectra Biometric Local Office Bridge        ');
    console.log('==================================================');
    console.log(`Device Address  : ${DEVICE_IP}:${DEVICE_PORT}`);
    console.log(`Cloud Endpoint  : ${CLOUD_API_URL}`);
    console.log(`Cloud Health    : ${CLOUD_HEALTH_URL}`);
    console.log(`Mode            : one-time import, then real-time push`);
    console.log(`Initial Window  : ${SYNC_BACK_DAYS > 0 ? SYNC_BACK_DAYS + ' days' : 'all history'}`);
    console.log(`Safety Sweep    : every ${SWEEP_INTERVAL_MS / 60000} minute(s)`);
    console.log(`Device Timezone : ${DEVICE_TZ_OFFSET}`);
    console.log(`State File      : ${STATE_FILE}\n`);
}

const stamp = () => new Date().toLocaleTimeString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** node-zklib rejects with a ZKError wrapper whose message lives at .err.message. */
function describeError(err) {
    if (!err) return 'Unknown error';
    return err.err?.message || err.message || (typeof err === 'string' ? err : JSON.stringify(err));
}

function normalizeEmployeeCode(code) {
    return String(code || '').trim();
}

function sanitizeDisplayName(name, fallbackCode) {
    const normalizedName = String(name || '').trim();
    return normalizedName || `Employee ${fallbackCode}`;
}

/* -------------------------------------------------------------------------- */
/* Checkpoint state                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Shape: { initialImportDone: boolean, lastSyncedTimestamp: string | null }
 * lastSyncedTimestamp is the newest punch (ISO/UTC) we have successfully posted.
 */
let state = { initialImportDone: false, lastSyncedTimestamp: null };

async function loadState() {
    try {
        const raw = await fs.readFile(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        state = {
            initialImportDone: Boolean(parsed.initialImportDone),
            lastSyncedTimestamp: parsed.lastSyncedTimestamp || null
        };
        console.log(`[${stamp()}] Checkpoint loaded. Last synced punch: ${state.lastSyncedTimestamp || 'none'}`);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn(`[${stamp()}] Could not read state file (${err.message}). Treating as first run.`);
        }
        console.log(`[${stamp()}] No checkpoint found - this run will perform the one-time historical import.`);
    }
}

async function saveState() {
    try {
        await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
        console.error(`[${stamp()}] WARNING: failed to persist checkpoint: ${err.message}`);
    }
}

/** Current checkpoint - the newest punch we have confirmed delivered. */
function getCheckpoint() {
    return state.lastSyncedTimestamp;
}

/** Move the checkpoint forward. Never moves backwards. */
async function advanceCheckpoint(isoTimestamp) {
    if (!isoTimestamp) return;
    if (!state.lastSyncedTimestamp || new Date(isoTimestamp) > new Date(state.lastSyncedTimestamp)) {
        state.lastSyncedTimestamp = isoTimestamp;
        await saveState();
    }
}

/* -------------------------------------------------------------------------- */
/* Timestamp normalisation                                                     */
/* -------------------------------------------------------------------------- */

const pad = (n) => String(n).padStart(2, '0');

/**
 * The device reports wall-clock time with no timezone. node-zklib parses it into a
 * Date using the *host* machine's timezone, which silently corrupts the value if this
 * PC is not set to the same zone as the device. So we always re-stamp the wall-clock
 * components with DEVICE_TZ_OFFSET.
 */
function toIsoFromDevice(raw) {
    if (raw instanceof Date) {
        if (Number.isNaN(raw.getTime())) return null;
        const wall = `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`
            + `T${pad(raw.getHours())}:${pad(raw.getMinutes())}:${pad(raw.getSeconds())}`;
        return new Date(`${wall}${DEVICE_TZ_OFFSET}`).toISOString();
    }

    if (typeof raw === 'string') {
        const parsed = raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)
            ? new Date(raw)
            : new Date(`${raw.trim().replace(' ', 'T')}${DEVICE_TZ_OFFSET}`);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Cloud upload                                                                */
/* -------------------------------------------------------------------------- */

/**
 * POST records to the cloud. Retries transient failures so a brief network blip
 * does not leave the checkpoint behind unsent punches.
 */
async function postChunk(chunk, attempt = 1) {
    const maxAttempts = 4;
    try {
        const response = await fetch(CLOUD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-sync-secret': SYNC_SECRET
            },
            body: JSON.stringify({ records: chunk })
        });

        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error('Cloud rejected the sync secret. Set BIOMETRIC_SYNC_SECRET on Vercel to match this bridge.');
        }
        if (response.status === 422) {
            throw new Error(data.message || 'Cloud rejected this punch batch (invalid timestamps or empty payload).');
        }
        if (!response.ok || !data.success) {
            throw new Error(data.message || response.statusText || `HTTP ${response.status}`);
        }
        return data;
    } catch (err) {
        if (attempt >= maxAttempts) throw err;
        const delayMs = attempt * 2000;
        console.warn(`[${stamp()}] Cloud upload failed (attempt ${attempt}/${maxAttempts}): ${err.message}. Retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
        return postChunk(chunk, attempt + 1);
    }
}

async function validateCloudConnection() {
    console.log(`[${stamp()}] Verifying cloud bridge credentials...`);
    const response = await fetch(CLOUD_HEALTH_URL, {
        headers: { 'x-sync-secret': SYNC_SECRET }
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        throw new Error('Cloud rejected the sync secret. Set BIOMETRIC_SYNC_SECRET on Vercel to match BIOMETRIC_SYNC_SECRET/SYNC_SECRET on this PC.');
    }
    if (!response.ok || !data.ok) {
        throw new Error(data.message || `Bridge health check failed (${response.status})`);
    }

    const lastPunch = data.lastPunchAt ? new Date(data.lastPunchAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'none';
    console.log(`[${stamp()}] Cloud bridge OK. Last punch in cloud: ${lastPunch}. Bridge status: ${data.status || 'unknown'}.`);
}

/** Post a batch, chunked. Returns the newest ISO timestamp that was fully accepted. */
async function postRecords(records, { label }) {
    if (records.length === 0) return null;

    // Oldest first, so a mid-way failure still leaves a truthful checkpoint.
    const ordered = [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const totalChunks = Math.ceil(ordered.length / CHUNK_SIZE);
    let highWaterMark = null;
    let accepted = 0;

    for (let i = 0; i < ordered.length; i += CHUNK_SIZE) {
        const chunk = ordered.slice(i, i + CHUNK_SIZE);
        const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;

        if (totalChunks > 1) {
            console.log(`[${stamp()}] ${label}: posting chunk ${chunkNum}/${totalChunks} (${chunk.length} records)...`);
        }

        try {
            const data = await postChunk(chunk);
            accepted += chunk.length;
            highWaterMark = chunk[chunk.length - 1].timestamp;
            await advanceCheckpoint(highWaterMark);
            if (data.createdUsersCount) {
                console.log(`[${stamp()}] ${label}: ${data.createdUsersCount} new employee(s) created in cloud.`);
            }
        } catch (err) {
            console.error(`[${stamp()}] ${label}: CLOUD ERROR on chunk ${chunkNum} - ${err.message}`);
            console.error(`[${stamp()}] ${label}: stopping here; checkpoint stays at ${state.lastSyncedTimestamp || 'none'} so nothing is lost.`);
            break;
        }
    }

    console.log(`[${stamp()}] ${label}: ${accepted}/${ordered.length} record(s) delivered.`);
    return highWaterMark;
}

/* -------------------------------------------------------------------------- */
/* New-record selection                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Decide which of the device's records still need to be sent.
 *
 * - With a checkpoint: everything newer than (checkpoint - overlap). This is the
 *   steady state, and it is what stops us re-sending 10,000 old rows every cycle.
 * - Without a checkpoint (first run): the SYNC_BACK_DAYS window, or all history if 0.
 *
 * Pure function so it can be unit-tested without a device.
 */
export function selectNewRecords(records, {
    lastSyncedTimestamp = null,
    syncBackDays = SYNC_BACK_DAYS,
    overlapMs = SWEEP_OVERLAP_MS,
    now = Date.now()
} = {}) {
    let cutoff = null;

    if (lastSyncedTimestamp) {
        cutoff = new Date(new Date(lastSyncedTimestamp).getTime() - overlapMs);
    } else if (syncBackDays > 0) {
        cutoff = new Date(now - syncBackDays * 24 * 60 * 60 * 1000);
    }

    const newRecords = cutoff
        ? records.filter((r) => new Date(r.timestamp) > cutoff)
        : [...records];

    const newest = records.reduce(
        (max, r) => (!max || new Date(r.timestamp) > new Date(max) ? r.timestamp : max),
        null
    );

    return { cutoff, newRecords, newest };
}

/* -------------------------------------------------------------------------- */
/* Device reads                                                                */
/* -------------------------------------------------------------------------- */

async function fetchDeviceUserMap(zkInstance) {
    const users = await zkInstance.getUsers();
    return new Map(
        ((users && users.data) || []).map((deviceUser) => [
            normalizeEmployeeCode(deviceUser.uid),
            sanitizeDisplayName(deviceUser.name, normalizeEmployeeCode(deviceUser.uid))
        ])
    );
}

/**
 * Read the device log and post ONLY what is newer than our checkpoint.
 * On the very first run there is no checkpoint, so this is the one-time historical import.
 */
async function runSweep(zkInstance, deviceUserMap) {
    const isInitialImport = !state.initialImportDone;
    const label = isInitialImport ? 'INITIAL IMPORT' : 'SAFETY SWEEP';

    console.log(`[${stamp()}] ${label}: reading device attendance log...`);
    const logs = await zkInstance.getAttendances();

    if (!logs || !logs.data || !logs.data.length) {
        console.log(`[${stamp()}] ${label}: device reported no records.`);
        if (isInitialImport) {
            state.initialImportDone = true;
            await saveState();
        }
        return;
    }

    const records = logs.data
        .map((log) => {
            const employeeCode = normalizeEmployeeCode(log.deviceUserId);
            const timestamp = toIsoFromDevice(log.recordTime);
            if (!employeeCode || !timestamp) return null;
            return {
                employeeCode,
                employeeName: deviceUserMap.get(employeeCode) || `Employee ${employeeCode}`,
                timestamp
            };
        })
        .filter(Boolean);

    console.log(`[${stamp()}] ${label}: ${records.length} valid record(s) on device (of ${logs.data.length} raw).`);

    const { cutoff, newRecords, newest } = selectNewRecords(records, {
        lastSyncedTimestamp: state.lastSyncedTimestamp
    });

    if (state.lastSyncedTimestamp) {
        console.log(`[${stamp()}] ${label}: only sending punches after ${cutoff.toISOString()} (checkpoint ${state.lastSyncedTimestamp} minus overlap).`);
    } else if (cutoff) {
        console.log(`[${stamp()}] ${label}: importing punches after ${cutoff.toISOString()} (${SYNC_BACK_DAYS} day window).`);
    } else {
        console.log(`[${stamp()}] ${label}: importing entire device history.`);
    }

    if (newRecords.length === 0) {
        console.log(`[${stamp()}] ${label}: nothing new. Device is already in sync.`);
        // Still anchor the checkpoint on the first run so we never re-scan history again.
        if (isInitialImport) {
            await advanceCheckpoint(newest);
        }
    } else {
        console.log(`[${stamp()}] ${label}: ${newRecords.length} new punch(es) to send.`);
        await postRecords(newRecords, { label });
    }

    if (isInitialImport) {
        state.initialImportDone = true;
        await saveState();
        console.log(`[${stamp()}] INITIAL IMPORT complete. From now on only NEW punches are sent.`);
    }
}

/* -------------------------------------------------------------------------- */
/* Real-time listener                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Register for the device's live punch stream. The device pushes each scan down the
 * open socket immediately, so a punch reaches the cloud in about a second.
 */
async function startRealtime(zkInstance, deviceUserMap) {
    let inFlight = Promise.resolve();

    // node-zklib only attaches its real-time handler when the socket has NO 'data'
    // listener (zklibtcp.js: `listenerCount('data') === 0 && socket.on(...)`), and its
    // readWithBuffer cleanup is commented out upstream - so getUsers()/getAttendances()
    // leave a listener behind forever. On a leaked socket the call below would silently
    // do nothing and no punch would ever arrive. We use a fresh socket for real-time,
    // and assert that here so a future refactor fails loudly instead of going quiet.
    const socket = zkInstance.zklibTcp?.socket;
    if (socket && socket.listenerCount('data') > 0) {
        console.warn(`[${stamp()}] Clearing ${socket.listenerCount('data')} stale socket listener(s) before arming real-time stream.`);
        socket.removeAllListeners('data');
    }

    await zkInstance.getRealTimeLogs((entry) => {
        const employeeCode = normalizeEmployeeCode(entry?.userId);
        const timestamp = toIsoFromDevice(entry?.attTime);

        if (!employeeCode || !timestamp) {
            console.warn(`[${stamp()}] LIVE: ignoring malformed event`, entry);
            return;
        }

        const record = {
            employeeCode,
            employeeName: deviceUserMap.get(employeeCode) || `Employee ${employeeCode}`,
            timestamp
        };

        console.log(`[${stamp()}] LIVE PUNCH: ${record.employeeName} (${employeeCode}) at ${timestamp}`);

        // Serialise uploads so two fast punches cannot race the checkpoint backwards.
        inFlight = inFlight.then(async () => {
            const startedAt = Date.now();
            try {
                await postChunk([record]);
                await advanceCheckpoint(timestamp);
                console.log(`[${stamp()}] LIVE PUNCH: pushed to cloud in ${Date.now() - startedAt}ms.`);
            } catch (err) {
                console.error(`[${stamp()}] LIVE PUNCH: upload failed (${err.message}). The next safety sweep will retry it.`);
            }
        });
    });

    // Debug tap: when enabled, log every raw frame the device sends on the live
    // socket. This runs ALONGSIDE the library's own event handler (multiple 'data'
    // listeners are fine); it must be attached AFTER getRealTimeLogs so we never
    // trip its `listenerCount === 0` arming guard.
    if (process.env.DEBUG_RAW_EVENTS === 'true') {
        const socket = zkInstance.zklibTcp?.socket;
        socket?.on('data', (buf) => {
            console.log(`[${stamp()}] RAW FRAME (${buf.length} bytes): ${buf.toString('hex')}`);
        });
        console.log(`[${stamp()}] Raw event debug tap enabled.`);
    }

    console.log(`[${stamp()}] Live punch stream is active. Waiting for scans...`);
}

/* -------------------------------------------------------------------------- */
/* Session loop                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Open a device connection. `onDrop` fires if the link errors or closes.
 *
 * node-zklib sets socket.setTimeout() but never handles the 'timeout' event, so a
 * powered-off or unplugged device leaves createSocket() hanging until the OS TCP
 * timeout (over a minute) with no log line. We impose our own deadline so the retry
 * loop stays responsive.
 */
async function openDevice(onDrop) {
    const zkInstance = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

    const connecting = zkInstance.createSocket(
        (err) => {
            console.error(`[${stamp()}] Device socket error: ${describeError(err)}`);
            onDrop?.('error');
        },
        () => onDrop?.('closed')
    );
    // The loser of the race below stays pending; swallow its late rejection.
    connecting.catch(() => {});

    let timer = null;
    try {
        await Promise.race([
            connecting,
            new Promise((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error(`Device ${DEVICE_IP}:${DEVICE_PORT} did not respond within ${CONNECT_TIMEOUT_MS / 1000}s`)),
                    CONNECT_TIMEOUT_MS
                );
            })
        ]);
    } catch (err) {
        try { zkInstance.zklibTcp?.socket?.destroy(); } catch { /* already gone */ }
        try { zkInstance.zklibUdp?.socket?.close?.(); } catch { /* already gone */ }
        throw err;
    } finally {
        clearTimeout(timer);
    }

    return zkInstance;
}

async function closeDevice(zkInstance) {
    if (!zkInstance?.disconnect) return;
    try {
        await zkInstance.disconnect();
    } catch {
        // Ignore disconnect errors - we are tearing down anyway.
    }
}

/**
 * One session runs in two phases on two separate sockets:
 *
 *   Phase 1 (short-lived socket): read the user catalog and run the sweep.
 *   Phase 2 (fresh socket):       arm the real-time punch stream and hold it open.
 *
 * They MUST NOT share a socket: getUsers()/getAttendances() leak a 'data' listener
 * (see startRealtime), which would stop the real-time stream from ever arming.
 */
async function runSession() {
    // --- Phase 1: sweep -----------------------------------------------------
    let sweepConn = null;
    let deviceUserMap;
    try {
        console.log(`[${stamp()}] Connecting to biometric machine (${DEVICE_IP}:${DEVICE_PORT})...`);
        sweepConn = await openDevice();
        console.log(`[${stamp()}] Connected.`);

        deviceUserMap = await fetchDeviceUserMap(sweepConn);
        console.log(`[${stamp()}] Loaded ${deviceUserMap.size} employee(s) from device catalog.`);

        await runSweep(sweepConn, deviceUserMap);
    } finally {
        await closeDevice(sweepConn);
    }

    // --- Phase 2: live stream on a clean socket -----------------------------
    let liveConn = null;
    let onDrop = null;
    const dropped = new Promise((resolve) => { onDrop = resolve; });

    try {
        liveConn = await openDevice((reason) => onDrop(reason));
        await startRealtime(liveConn, deviceUserMap);

        // Hold the live connection open until the next sweep is due, or the link drops.
        const reason = await Promise.race([
            dropped,
            sleep(SWEEP_INTERVAL_MS).then(() => 'sweep-due')
        ]);

        if (reason === 'sweep-due') {
            console.log(`[${stamp()}] Sweep interval reached - cycling connection for a safety re-check.`);
        } else {
            console.log(`[${stamp()}] Device link ${reason}. Reconnecting...`);
        }
    } finally {
        await closeDevice(liveConn);
    }
}

async function main() {
    printBanner();
    await loadState();

    while (true) {
        try {
            await validateCloudConnection();
            break;
        } catch (err) {
            console.error(`[${stamp()}] Cloud check failed: ${err.message}`);
            console.log(`[${stamp()}] Retrying cloud check in 10s...`);
            await sleep(10000);
        }
    }

    while (true) {
        try {
            await runSession();
        } catch (err) {
            console.error(`[${stamp()}] LOCAL BRIDGE ERROR: ${describeError(err)}`);
            console.log(`[${stamp()}] Retrying in ${RECONNECT_DELAY_MS / 1000}s...`);
            await sleep(RECONNECT_DELAY_MS);
        }
    }
}

process.on('SIGINT', async () => {
    console.log('\nStopping bridge. Saving checkpoint...');
    await saveState();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await saveState();
    process.exit(0);
});

// Only start the bridge when run directly, so the helpers above stay unit-testable.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    await main();
}

export {
    toIsoFromDevice,
    normalizeEmployeeCode,
    sanitizeDisplayName,
    // Exported for tests:
    postRecords,
    loadState,
    getCheckpoint
};
