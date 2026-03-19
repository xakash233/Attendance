import biometricService from './biometricService.js';
import prisma from '../../config/prisma.js';

let syncInterval = null;

export const startBiometricAutoSync = (intervalInSeconds = 10) => {
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

    try {
        isSyncing = true;
        // Fetch settings for IP and Port if available, else use defaults
        const settings = await prisma.systemSettings.findFirst();
        const ip = settings?.biometricDeviceIP || '192.168.1.2';
        const port = 4370; // Common default ZKTeco port

        console.log(`[BiometricSyncTask] Auto-syncing from device ${ip}:${port}...`);

        const result = await biometricService.syncFromDevice(ip, port, null);
        console.log(`[BiometricSyncTask] Auto-sync complete.`, result.message);
    } catch (error) {
        console.error(`[BiometricSyncTask] Auto-sync failed: ${error.message}`);
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
