const express = require('express');
const router = express.Router();
const auditService = require('../services/audit/auditService');
const { protect, authorize } = require('../middleware/auth');

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

module.exports = router;
