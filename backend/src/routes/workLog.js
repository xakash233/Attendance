import express from 'express';
import { addWorkLog, updateWorkLog, deleteWorkLog, getMyWorkLogs, getAllWorkLogs, getOvertimeSummary } from '../controllers/workLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Employee routes
router.post('/', addWorkLog);
router.put('/:id', updateWorkLog);
router.delete('/:id', deleteWorkLog);
router.get('/my', getMyWorkLogs);

// Admin routes
router.get('/', authorize('ADMIN', 'SUPER_ADMIN', 'HR'), getAllWorkLogs);
router.get('/overtime-summary', authorize('ADMIN', 'SUPER_ADMIN', 'HR'), getOvertimeSummary);

export default router;
