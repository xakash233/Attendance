import express from 'express';
import {
    getUsers,
    initUserCreation,
    verifyUserCreation,
    getUserProfile,
    updateUserProfile,
    changePassword,
    getAnalytics,
    globalSearch,
    deleteUser,
    updateUser,
    verifyEmailUpdate
} from '../controllers/user.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getUsers);
router.post('/init-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), initUserCreation);
router.post('/verify-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), verifyUserCreation);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.get('/analytics', protect, getAnalytics);
router.get('/search', protect, globalSearch);
router.put('/:id', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), updateUser);
router.post('/:id/verify-email', protect, authorize('SUPER_ADMIN'), verifyEmailUpdate);
router.delete('/:id', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), deleteUser);

export default router;
