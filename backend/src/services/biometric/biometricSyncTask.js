import biometricService from './biometricService.js';
import prisma from '../../config/prisma.js';

let syncInterval = null;
let cooldownUntil = 0;
let cachedDeviceIp = null;

export const startBiometricAutoSync = (intervalInSeconds = 10) => {
    if (process.env.ENABLE_BIOMETRIC_AUTO_SYNC !== 'true') {
        console.log('[BiometricSyncTask] Auto-sync is disabled by ENABLE_BIOMETRIC_AUTO_SYNC flag.');
        return;
    }
    if (syncInterval) {
        clearInterval(syncInterval);
    }

    console.log(`[BiometricSyncTask] Auto-sync started. Interval: ${intervalInSeconds} seconds.`);

    // First run
    runDeviceSync();

    syncInterval = setInterval(runDeviceSync, intervalInSeconds * 1000);
};

let isSyncing = false;

const runDeviceSync = async () => {
    if (isSyncing) {
        console.log('[BiometricSyncTask] Sync already in progress, skipping...');
        return;
    }
    if (Date.now() < cooldownUntil) {
        return;
    }

    try {
        isSyncing = true;
        // Fetch settings occasionally; fallback to cached/default to reduce DB pressure.
        let ip = cachedDeviceIp;
        if (!ip) {
            const settings = await prisma.systemSettings.findFirst();
            ip = settings?.biometricDeviceIP || '192.168.68.60';
            cachedDeviceIp = ip;
        }
        const port = 4370; // Common default ZKTeco port

        console.log(`[BiometricSyncTask] Auto-syncing from device ${ip}:${port}...`);

        const result = await biometricService.syncFromDevice(ip, port, null);
        console.log(`[BiometricSyncTask] Auto-sync complete.`, result.message);
    } catch (error) {
        console.error(`[BiometricSyncTask] Auto-sync failed: ${error.message}`);
        // Connection exhaustion: back off to avoid hammering DB.
        if (String(error.message).toLowerCase().includes('too many database connections')) {
            cooldownUntil = Date.now() + (5 * 60 * 1000);
            console.warn('[BiometricSyncTask] DB connection limit reached. Cooling down sync for 5 minutes.');
        } else {
            // Retry settings read in next cycle for non-connection errors.
            cachedDeviceIp = null;
        }
    } finally {
        isSyncing = false;
    }
};

export const stopBiometricAutoSync = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log(`[BiometricSyncTask] Auto-sync stopped.`);
    }
};
