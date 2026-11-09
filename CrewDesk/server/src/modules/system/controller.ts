import { Request, Response, NextFunction } from 'express';
import { systemService } from './service.js';
import { updateSettingsSchema, auditLogQuerySchema } from './schemas.js';

export class SystemController {
  // Notifications
  getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifs = await systemService.listMyNotifications(req.user!.userId);
      res.json({ success: true, data: notifs });
    } catch (err) {
      next(err);
    }
  };

  markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await systemService.markNotificationAsRead(req.user!.userId, req.params.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await systemService.markAllNotificationsAsRead(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  // Audit Logs
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = auditLogQuerySchema.parse(req.query);
      const logs = await systemService.listAuditLogs(query, Boolean(req.user!.isDemo));
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  };

  // Settings
  getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await systemService.getSettings();
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateSettingsSchema.parse(req.body);
      const updated = await systemService.updateSettings(req.user!.userId, input);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };
}

export const systemController = new SystemController();
