const express = require('express');
const router = express.Router();
const {
    getUsers,
    initUserCreation,
    verifyUserCreation,
    getUserProfile,
    getAnalytics
} = require('../controllers/user');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN'), getUsers);
router.post('/init-creation', protect, authorize('SUPER_ADMIN', 'ADMIN'), initUserCreation);
router.post('/verify-creation', protect, authorize('SUPER_ADMIN', 'ADMIN'), verifyUserCreation);
router.get('/profile', protect, getUserProfile);
router.get('/analytics', protect, getAnalytics);

module.exports = router;
