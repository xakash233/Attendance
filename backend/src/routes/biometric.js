import express from 'express';
import { syncBiometricUpload, getSyncLogs, getLatestRecords, syncFromDevice, syncUsersFromDevice } from '../controllers/biometric.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/sync', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), upload.single('file'), syncBiometricUpload);
router.post('/sync-device', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), syncFromDevice);
router.post('/sync-users', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), syncUsersFromDevice);
router.get('/logs', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getSyncLogs);
router.get('/records', protect, getLatestRecords);

export default router;
