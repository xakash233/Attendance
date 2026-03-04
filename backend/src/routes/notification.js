const express = require('express');
const router = express.Router();

const { getNotifications, markAsRead, markAllRead } = require('../controllers/notification');
const { protect } = require('../middleware/auth'); // fixed path

// Protect all notification routes
router.use(protect);

// Get all notifications
router.get('/', getNotifications);

// Mark all notifications as read
router.put('/read-all', markAllRead);

// Mark single notification as read
router.put('/:id/read', markAsRead);

module.exports = router;
