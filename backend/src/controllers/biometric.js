import biometricService from '../services/biometric/biometricService.js';
import auditService from '../services/audit/auditService.js';

/**
 * Handle manual file upload (CSV, JSON, XML) and start sync
 * POST /api/biometric/sync
 */
export const syncBiometricUpload = async (req, res, next) => {
    try {
        if (!req.file && (!req.body.records || !req.body.records.length)) {
            return res.status(400).json({ success: false, message: 'Please upload a file or provide records payload.' });
        }

        const deviceIP = req.ip || req.connection.remoteAddress;

        const result = await biometricService.processSync({
            rawRecords: req.body.records, // From JSON/eSSL body
            fileBuffer: req.file ? req.file.buffer : null, // From excel/csv/xml file
            mimeType: req.file ? req.file.mimetype : null,
            filename: req.file ? req.file.originalname : null,
            deviceIP,
            userId: req.user.id // From auth middleware
        });

        res.status(200).json({ success: true, ...result });

    } catch (error) {
        next(error);
    }
};

export const getSyncLogs = async (req, res, next) => {
    try {
        const logs = await biometricService.getSyncLogs();
        res.status(200).json(logs);
    } catch (error) {
        next(error);
    }
};

export const getLatestRecords = async (req, res, next) => {
    try {
        const records = await biometricService.getLatestRecords();
        res.status(200).json(records);
    } catch (error) {
        next(error);
    }
};
export const syncFromDevice = async (req, res, next) => {
    try {
        const { ip, port } = req.body;
        const result = await biometricService.syncFromDevice(ip, port, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const syncUsersFromDevice = async (req, res, next) => {
    try {
        const { ip, port } = req.body;
        const result = await biometricService.syncUsersFromDevice(ip, port);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Endpoint for local office bridge agent to post punch records directly
 * POST /api/biometric/agent-sync
 * Header: x-sync-secret: <BIOMETRIC_SYNC_SECRET>
 */
export const agentSyncBiometric = async (req, res, next) => {
    try {
        const providedSecret = req.headers['x-sync-secret'];
        const expectedSecret = process.env.BIOMETRIC_SYNC_SECRET;

        if (!expectedSecret) {
            console.error('[agentSyncBiometric] Critical: BIOMETRIC_SYNC_SECRET is not configured on the server.');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

        if (!providedSecret || providedSecret !== expectedSecret) {
            return res.status(401).json({ success: false, message: 'Invalid or missing bridge sync secret' });
        }

        const records = req.body.records;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: records must be an array' });
        }

        if (records.length === 0) {
            return res.status(400).json({ success: false, message: 'No records provided in payload' });
        }

        // Validate basic record shape to prevent crashes down the line
        for (const record of records) {
            if (!record.employeeCode || !record.timestamp) {
                return res.status(400).json({ success: false, message: 'Malformed record detected: Missing employeeCode or timestamp' });
            }
        }

        const deviceIP = req.headers['x-forwarded-for'] || req.ip || 'LOCAL_AGENT';

        const result = await biometricService.processSync({
            rawRecords: records,
            deviceIP,
            filename: `LOCAL_BRIDGE_SYNC_${new Date().toISOString()}`
        });

        res.status(200).json({ 
            success: true, 
            processed: result.totalProcessed || 0,
            created: result.successCount || 0,
            skipped: result.failCount || 0,
            message: result.status === 'SUCCESS' ? 'Sync completed successfully' : 'Sync completed with partial failures',
            ...result 
        });
    } catch (error) {
        next(error);
    }
};

