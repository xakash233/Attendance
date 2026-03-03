const express = require('express');
const router = express.Router();
const {
    applyLeave,
    hrDecision,
    finalDecision,
    getHistory,
    getLeaveTypes
} = require('../controllers/leave');
const { protect, authorize } = require('../middleware/auth');

router.post('/apply', protect, authorize('EMPLOYEE'), applyLeave);
router.put('/:id/hr-decision', protect, authorize('HR'), hrDecision);
router.put('/:id/final-decision', protect, authorize('SUPER_ADMIN'), finalDecision);
router.get('/history', protect, getHistory);
router.get('/types', protect, getLeaveTypes);

module.exports = router;
