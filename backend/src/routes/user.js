import express from 'express';
import {
    getEmployeeDirectory,
    getUsers,
    initUserCreation,
    verifyUserCreation,
    getUserProfile,
    updateUserProfile,
    uploadProfileAvatar,
    changePassword,
    getAnalytics,
    globalSearch,
    deleteUser,
    updateUser,
    verifyEmailUpdate,
    getUser
} from '../controllers/user.js';
import { protect, authorize } from '../middleware/auth.js';
import imageUpload from '../middleware/imageUpload.js';

const router = express.Router();

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT'), getUsers);
router.post('/init-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), initUserCreation);
router.post('/verify-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), verifyUserCreation);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/profile/avatar', protect, imageUpload.single('avatar'), uploadProfileAvatar);
router.put('/change-password', protect, changePassword);
router.get('/analytics', protect, getAnalytics);
router.get('/search', protect, globalSearch);
router.get('/directory', protect, getEmployeeDirectory);
router.get('/:id', protect, getUser);
router.put('/:id', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), updateUser);
router.post('/:id/verify-email', protect, authorize('SUPER_ADMIN'), verifyEmailUpdate);
router.delete('/:id', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), deleteUser);

export default router;
