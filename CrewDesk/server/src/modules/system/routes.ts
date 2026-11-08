import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { systemController } from './controller.js';

const router = Router();

// Notifications (all authenticated roles, own only)
router.get('/notifications', authenticate, requirePermission('notification:read-own'), systemController.getMyNotifications);
router.patch('/notifications/:id/read', authenticate, requirePermission('notification:read-own'), systemController.markNotificationRead);
router.patch('/notifications/read-all', authenticate, requirePermission('notification:read-own'), systemController.markAllNotificationsRead);

// Audit Log Viewer (Owner only, strictly append-only, no update/delete routes)
router.get('/audit-logs', authenticate, requirePermission('audit:read'), systemController.getAuditLogs);

// Company Settings (Read for all authenticated, update for Owner only)
router.get('/settings', authenticate, systemController.getSettings);
router.put('/settings', authenticate, requirePermission('settings:manage'), systemController.updateSettings);

export default router;
