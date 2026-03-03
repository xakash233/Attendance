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

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getUsers);
router.post('/init-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), initUserCreation);
router.post('/verify-creation', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), verifyUserCreation);
router.get('/profile', protect, getUserProfile);
router.get('/analytics', protect, getAnalytics);

module.exports = router;
