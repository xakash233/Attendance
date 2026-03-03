const express = require('express');
const router = express.Router();
const { login, refreshToken, logout, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
