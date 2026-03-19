import express from 'express';
import { syncBiometricUpload, getSyncLogs, getLatestRecords, syncFromDevice } from '../controllers/biometric.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/sync', protect, authorize('SUPER_ADMIN', 'ADMIN'), upload.single('file'), syncBiometricUpload);
router.post('/sync-device', protect, authorize('SUPER_ADMIN', 'ADMIN'), syncFromDevice);
router.get('/logs', protect, authorize('SUPER_ADMIN', 'ADMIN'), getSyncLogs);
router.get('/records', protect, getLatestRecords);

export default router;
