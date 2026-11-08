import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { updateSettingsSchema, auditLogQuerySchema } from './schemas.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export class SystemService {
  // --- NOTIFICATIONS ---
  async listMyNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Notification not found' };
    }

    if (notif.userId !== userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied' };
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // --- AUDIT LOGS (APPEND-ONLY, OWNER-ONLY) ---
  async listAuditLogs(query: z.infer<typeof auditLogQuerySchema>) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entityType) where.entityType = { contains: query.entityType, mode: 'insensitive' };
    if (query.actorId) where.actorId = query.actorId;

    const skip = (query.page - 1) * query.limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    return {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      logs,
    };
  }

  // --- COMPANY SETTINGS ---
  async getSettings() {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'CrewDesk Agency',
          currency: 'USD',
          timezone: 'UTC',
          officeStartTime: '09:00',
          lateGraceMinutes: 15,
        },
      });
    }
    return settings;
  }

  async updateSettings(actorId: string, input: z.infer<typeof updateSettingsSchema>) {
    const current = await this.getSettings();

    const updated = await prisma.companySettings.update({
      where: { id: current.id },
      data: {
        companyName: input.companyName,
        currency: input.currency,
        timezone: input.timezone,
        officeStartTime: input.officeStartTime,
        lateGraceMinutes: input.lateGraceMinutes,
      },
    });

    await logAudit(
      actorId,
      'settings:update',
      'CompanySettings',
      updated.id,
      {
        companyName: current.companyName,
        currency: current.currency,
        timezone: current.timezone,
        officeStartTime: current.officeStartTime,
        lateGraceMinutes: current.lateGraceMinutes,
      },
      {
        companyName: updated.companyName,
        currency: updated.currency,
        timezone: updated.timezone,
        officeStartTime: updated.officeStartTime,
        lateGraceMinutes: updated.lateGraceMinutes,
      }
    );

    return updated;
  }
}

export const systemService = new SystemService();
