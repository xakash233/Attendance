import express from 'express';
import { login, refreshToken, logout, forgotPassword, resetPassword } from '../controllers/auth.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
