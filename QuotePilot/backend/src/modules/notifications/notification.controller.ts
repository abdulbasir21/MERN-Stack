import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export class NotificationController {
  static listNotifications = asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.listNotifications(req.user!, {
      unread: req.query.unread as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    return sendSuccess(res, result.notifications, 200, result.meta);
  });

  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.getUnreadCount(req.user!);
    return sendSuccess(res, result, 200);
  });

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.markAsRead(req.user!, req.params.id);
    return sendSuccess(res, result, 200);
  });

  static markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.markAllAsRead(req.user!);
    return sendSuccess(res, result, 200);
  });
}
