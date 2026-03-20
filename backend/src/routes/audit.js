import express from 'express';
import { getAuditLogs } from '../controllers/audit.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Both Admins and Employees can see their respective logs
router.get('/', protect, getAuditLogs);

export default router;
