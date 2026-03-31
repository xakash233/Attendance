import express from 'express';
import { login, refreshToken, logout, forgotPassword, resetPassword, changePassword } from '../controllers/auth.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);

export default router;
