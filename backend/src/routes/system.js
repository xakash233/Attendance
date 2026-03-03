const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/system');
const { protect, authorize } = require('../middleware/auth');

router.get('/settings', protect, getSettings);
router.put('/settings', protect, authorize('SUPER_ADMIN'), updateSettings);

module.exports = router;
