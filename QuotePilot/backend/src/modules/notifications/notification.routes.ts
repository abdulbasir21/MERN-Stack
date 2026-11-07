import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// GET /api/v1/notifications (list user notifications)
router.get('/', authenticate, NotificationController.listNotifications);

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);

// POST /api/v1/notifications/read-all
router.post('/read-all', authenticate, NotificationController.markAllAsRead);

// POST /api/v1/notifications/:id/read
router.post('/:id/read', authenticate, NotificationController.markAsRead);

export default router;
