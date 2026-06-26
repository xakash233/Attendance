import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getMyAttendanceStatus,
    getPushPublicKey,
    subscribePush,
    unsubscribePush
} from '../controllers/push.js';

const router = express.Router();

router.get('/vapid-public-key', protect, getPushPublicKey);
router.post('/subscribe', protect, subscribePush);
router.post('/unsubscribe', protect, unsubscribePush);
router.get('/my-status', protect, getMyAttendanceStatus);

export default router;
