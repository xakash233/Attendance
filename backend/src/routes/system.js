import express from 'express';
import { getSettings, updateSettings, triggerAutoSync } from '../controllers/system.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', protect, getSettings);
router.put('/settings', protect, authorize('SUPER_ADMIN'), updateSettings);
router.get('/sync-biometric', triggerAutoSync); // Public but protected by secret check in controller
router.post('/debug-log', async (req, res) => {
    const fs = await import('fs');
    const path = await import('path');
    const logs = path.resolve('../backend/hits.log');
    fs.appendFileSync(logs, `[FE-DEBUG] ${new Date().toISOString()} | ${req.body.message}\n`);
    res.json({ ok: true });
});

export default router;
