import systemService from '../services/system/systemService.js';
import biometricService from '../services/biometric/biometricService.js';
import prisma from '../config/prisma.js';
import { runOutBreakMonitor } from '../services/attendance/outBreakMonitorService.js';

const verifyCronSecret = (req, res) => {
    const { secret } = req.query;
    const cronSecret = process.env.CRON_SECRET || 'sync-all-records-2026';

    if (secret !== cronSecret) {
        console.warn(`[CRON] Unauthorized attempt with secret: ${secret}`);
        res.status(401).json({ success: false, message: 'Registry Authentication Failed' });
        return false;
    }

    return true;
};

export const getSettings = async (req, res, next) => {
    try {
        const settings = await systemService.getSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

export const updateSettings = async (req, res, next) => {
    try {
        const updated = await systemService.updateSettings(req.body);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

/**
 * Endpoint for External Cron (Vercel/Upstash) to trigger auto-sync
 * GET /api/system/sync-biometric?secret=YOUR_CRON_SECRET
 */
export const triggerAutoSync = async (req, res, next) => {
    try {
        if (!verifyCronSecret(req, res)) return;

        console.log('[CRON] Biometric Auto-Sync triggered via endpoint.');

        const settings = await prisma.systemSettings.findFirst();
        const ip = settings?.biometricDeviceIP || '192.168.1.2';
        const port = 4370;

        const result = await biometricService.syncFromDevice(ip, port, 'SYSTEM_CRON');
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('[CRON] Sync failed:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Endpoint for External Cron to check long out-breaks and send push alerts
 * GET /api/system/check-out-breaks?secret=YOUR_CRON_SECRET
 */
export const triggerOutBreakCheck = async (req, res, next) => {
    try {
        if (!verifyCronSecret(req, res)) return;

        console.log('[CRON] Out-break monitor triggered via endpoint.');
        const result = await runOutBreakMonitor();
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('[CRON] Out-break monitor failed:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
