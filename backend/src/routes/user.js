import express from 'express';
import {
    getUsers,
    initUserCreation,
    verifyUserCreation,
    getUserProfile,
    getAnalytics
} from '../controllers/user.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getUsers);
router.post('/init-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), initUserCreation);
router.post('/verify-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), verifyUserCreation);
router.get('/profile', protect, getUserProfile);
router.get('/analytics', protect, getAnalytics);

export default router;
