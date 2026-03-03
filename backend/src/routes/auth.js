const express = require('express');
const router = express.Router();
const { login, refreshToken, logout } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);

module.exports = router;
