import express from 'express';
import { checkIn, checkOut, getHistory } from '../controllers/attendance.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/history', protect, getHistory);

export default router;
