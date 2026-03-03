const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getHistory } = require('../controllers/attendance');
const { protect, authorize } = require('../middleware/auth');

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/history', protect, getHistory);

module.exports = router;
