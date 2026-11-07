import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../../models/Notification';
import { IUser } from '../../models/User';
import { AppError } from '../../utils/AppError';
import { EmailService } from './email.service';

export interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  entity?: {
    type: 'inquiry' | 'quotation' | 'message' | 'company';
    id: string;
  };
  io?: any;
  emailParams?: {
    to: string;
    recipientName: string;
    template: 'inquiry_received' | 'quotation_received' | 'quotation_decision';
    data: any;
  };
}

export class NotificationService {
  /**
   * Universal notify method: persists notification, emits via socket, and sends email
   */
  static async notify(params: CreateNotificationParams): Promise<INotification> {
    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      type: params.type,
      title: params.title.trim(),
      body: params.body.trim(),
      link: params.link.trim(),
      entity: params.entity,
    });

    // 1. Live Socket Notification (API Contract §14 & OQ-25)
    if (params.io) {
      params.io.to(`user:${params.userId.toString()}`).emit('notification:new', {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        entity: notification.entity,
        createdAt: notification.createdAt,
      });
    }

    // 2. Email Dispatch
    if (params.emailParams) {
      const ep = params.emailParams;
      if (ep.template === 'inquiry_received') {
        EmailService.sendInquiryReceivedEmail({
          to: ep.to,
          recipientName: ep.recipientName,
          referenceNumber: ep.data.referenceNumber,
          serviceTitle: ep.data.serviceTitle,
          customerName: ep.data.customerName,
        }).catch((err) => console.error('[NotificationService] Email error:', err));
      } else if (ep.template === 'quotation_received') {
        EmailService.sendQuotationReceivedEmail({
          to: ep.to,
          recipientName: ep.recipientName,
          referenceNumber: ep.data.referenceNumber,
          companyName: ep.data.companyName,
          totalAmount: ep.data.totalAmount,
          version: ep.data.version || 1,
        }).catch((err) => console.error('[NotificationService] Email error:', err));
      } else if (ep.template === 'quotation_decision') {
        EmailService.sendQuotationDecisionEmail({
          to: ep.to,
          recipientName: ep.recipientName,
          referenceNumber: ep.data.referenceNumber,
          customerName: ep.data.customerName,
          status: ep.data.status,
          reason: ep.data.reason,
        }).catch((err) => console.error('[NotificationService] Email error:', err));
      }
    }

    return notification;
  }

  /**
   * Fetch paginated notifications for current authenticated user
   */
  static async listNotifications(
    user: IUser,
    query: { unread?: string; page?: string | number; limit?: string | number }
  ) {
    const filter: Record<string, any> = { userId: user._id };
    if (query.unread === 'true') {
      filter.readAt = { $exists: false };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: user._id, readAt: { $exists: false } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        entity: n.entity,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(user: IUser) {
    const count = await Notification.countDocuments({
      userId: user._id,
      readAt: { $exists: false },
    });
    return { count };
  }

  /**
   * Mark single notification as read
   */
  static async markAsRead(user: IUser, notificationId: string) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw AppError.notFound('Notification not found.');
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      userId: user._id,
    });

    if (!notification) {
      throw AppError.notFound('Notification not found.');
    }

    notification.readAt = new Date();
    await notification.save();

    return { notification };
  }

  /**
   * Mark all unread notifications as read for current user
   */
  static async markAllAsRead(user: IUser) {
    const result = await Notification.updateMany(
      { userId: user._id, readAt: { $exists: false } },
      { $set: { readAt: new Date() } }
    );
    return { updated: result.modifiedCount };
  }
}
