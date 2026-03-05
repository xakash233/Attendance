import express from 'express';
import {
    applyLeave,
    hrDecision,
    finalDecision,
    getHistory,
    getLeaveTypes,
    cancelLeave
} from '../controllers/leave.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/apply', protect, applyLeave);
router.put('/:id/hr-decision', protect, authorize('HR'), hrDecision);
router.put('/:id/final-decision', protect, authorize('SUPER_ADMIN'), finalDecision);
router.get('/history', protect, getHistory);
router.get('/types', protect, getLeaveTypes);
router.put('/:id/cancel', protect, cancelLeave);

export default router;
