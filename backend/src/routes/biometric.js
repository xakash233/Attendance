const express = require('express');
const router = express.Router();
const { syncBiometric, getSyncLogs } = require('../controllers/biometric');
const { protect, authorize } = require('../middleware/auth');

router.post('/sync', protect, authorize('SUPER_ADMIN', 'ADMIN'), syncBiometric);
router.get('/logs', protect, authorize('SUPER_ADMIN', 'ADMIN'), getSyncLogs);

module.exports = router;
