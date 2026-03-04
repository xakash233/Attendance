import express from 'express';
import { getSettings, updateSettings } from '../controllers/system.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', protect, getSettings);
router.put('/settings', protect, authorize('SUPER_ADMIN'), updateSettings);

export default router;
