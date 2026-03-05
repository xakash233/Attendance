import express from 'express';
import { checkIn, checkOut, getHistory, getSummary } from '../controllers/attendance.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/history', protect, getHistory);
router.get('/summary', protect, getSummary);
router.get('/user-summary/:id', protect, authorize('SUPER_ADMIN', 'HR', 'ADMIN'), getSummary);

export default router;
