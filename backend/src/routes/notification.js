import express from 'express';
import { getNotifications, markAsRead, markAllRead, deleteNotification } from '../controllers/notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protect all notification routes
router.use(protect);

// Get all notifications
router.get('/', getNotifications);

// Mark all notifications as read
router.put('/read-all', markAllRead);

// Mark single notification as read
router.put('/:id/read', markAsRead);

// Delete single notification
router.delete('/:id', deleteNotification);

export default router;
