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

/**
 * Get sync logs
 * GET /api/biometric/logs
 */
export const getSyncLogs = async (req, res, next) => {
    try {
        const logs = await biometricService.getSyncLogs();
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

export const getLatestRecords = async (req, res, next) => {
    try {
        const records = await biometricService.getLatestRecords();
        res.status(200).json({ success: true, data: records });
    } catch (error) {
        next(error);
    }
};
