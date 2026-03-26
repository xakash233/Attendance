import express from 'express';
import { getHolidays, createHoliday, deleteHoliday } from '../controllers/holiday.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getHolidays);
router.post('/', protect, authorize('SUPER_ADMIN'), createHoliday);
router.delete('/:id', protect, authorize('SUPER_ADMIN'), deleteHoliday);

export default router;
