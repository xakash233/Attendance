import express from 'express';
import {
    applyLeave,
    hrDecision,
    finalDecision,
    getHistory,
    getLeaveTypes,
    cancelLeave,
    deleteLeaveRequest
} from '../controllers/leave.js';
import { protect, authorize } from '../middleware/auth.js';
import leaveAttachmentUpload from '../middleware/leaveAttachmentUpload.js';

const router = express.Router();

router.post('/apply', protect, (req, res, next) => {
    leaveAttachmentUpload.single('attachment')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Attachment upload failed' });
        }
        return applyLeave(req, res, next);
    });
});
router.put('/:id/hr-decision', protect, authorize('HR'), hrDecision);
router.put('/:id/final-decision', protect, authorize('SUPER_ADMIN'), finalDecision);
router.get('/history', protect, getHistory);
router.get('/types', protect, getLeaveTypes);
router.put('/:id/cancel', protect, cancelLeave);
router.delete('/:id', protect, deleteLeaveRequest);

export default router;
