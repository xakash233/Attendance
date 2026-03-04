import express from 'express';
import auditService from '../services/audit/auditService.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const logs = await auditService.getLogs({
            limit: parseInt(req.query.limit) || 100,
            skip: parseInt(req.query.skip) || 0,
            entity: req.query.entity,
            action: req.query.action
        });
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
});

export default router;
