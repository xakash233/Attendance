import systemService from '../services/system/systemService.js';
import biometricService from '../services/biometric/biometricService.js';
import prisma from '../config/prisma.js';

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
        const { secret } = req.query;
        const cronSecret = process.env.CRON_SECRET || 'sync-all-records-2026'; // Fallback if not set but advised to set in Vercel

        if (secret !== cronSecret) {
            console.warn(`[CRON] Unauthorized sync attempt with secret: ${secret}`);
            return res.status(401).json({ success: false, message: 'Registry Authentication Failed' });
        }

        console.log('[CRON] Biometric Auto-Sync triggered via endpoint.');

        // Get hardware path from settings
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
