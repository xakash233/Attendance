import express from 'express';
import { getLeadsDashboard, exportLeadsReport } from '../controllers/leads.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN', 'ADMIN', 'HR'));

router.get('/dashboard', getLeadsDashboard);
router.get('/export', exportLeadsReport);

export default router;
