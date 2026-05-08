import express from 'express';
import { addWorkLog, updateWorkLog, deleteWorkLog, getMyWorkLogs, getAllWorkLogs, getOvertimeSummary } from '../controllers/workLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const NISHANTH_USER_ID = 'c7c74ad0-581f-405d-b47a-7f83590e66a0';

const allowNishanthOrSuperAdmin = (req, res, next) => {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isNishanth = req.user?.id === NISHANTH_USER_ID;

    if (!isSuperAdmin && !isNishanth) {
        return res.status(403).json({ message: 'Work logs are restricted to Nishanth and Super Admin only.' });
    }

    next();
};

router.use(protect);
router.use(allowNishanthOrSuperAdmin);

// Employee routes
router.post('/', addWorkLog);
router.put('/:id', updateWorkLog);
router.delete('/:id', deleteWorkLog);
router.get('/my', getMyWorkLogs);

// Admin routes
router.get('/', authorize('ADMIN', 'SUPER_ADMIN', 'HR'), getAllWorkLogs);
router.get('/overtime-summary', authorize('ADMIN', 'SUPER_ADMIN', 'HR'), getOvertimeSummary);

export default router;
