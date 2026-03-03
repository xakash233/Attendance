const express = require('express');
const router = express.Router();
const { syncBiometricUpload, getSyncLogs, getLatestRecords } = require('../controllers/biometric');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middlewares/upload');

router.post('/sync', protect, authorize('SUPER_ADMIN', 'ADMIN'), upload.single('file'), syncBiometricUpload);
router.get('/logs', protect, authorize('SUPER_ADMIN', 'ADMIN'), getSyncLogs);
router.get('/records', protect, getLatestRecords);

module.exports = router;
