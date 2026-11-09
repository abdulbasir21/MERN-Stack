import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { AuthenticatedUser } from '../../middleware/auth.js';
import { assertSameDemoScope } from '../../lib/demoScope.js';
import { createLeaveRequestSchema, rejectLeaveSchema, leaveQuerySchema } from './schemas.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export class LeaveService {
  /**
   * Business rule: Days = weekdays only (Monday to Friday).
   * No holidays, no half-days, no carry-over.
   */
  calculateWeekdays(startDateStr: string, endDateStr: string): number {
    const start = new Date(`${startDateStr}T00:00:00.000Z`);
    const end = new Date(`${endDateStr}T00:00:00.000Z`);

    if (start > end) {
      throw { status: 400, code: 'INVALID_DATE_RANGE', message: 'Start date cannot be after end date.' };
    }

    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getUTCDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return count;
  }

  async getLeaveBalancesWithRemaining(userId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: { userId, year: targetYear },
      include: { leaveType: true },
    });

    // Sum pending requests for each leave type
    const pendingRequests = await prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: {
        userId,
        status: 'PENDING',
        startDate: {
          gte: new Date(`${targetYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${targetYear}-12-31T23:59:59.999Z`),
        },
      },
      _sum: { daysCount: true },
    });

    const pendingMap = new Map<string, number>();
    for (const pr of pendingRequests) {
      pendingMap.set(pr.leaveTypeId, pr._sum.daysCount || 0);
    }

    // Derived: Remaining = allowance minus approved used minus pending
    return balances.map((b) => {
      const pending = pendingMap.get(b.leaveTypeId) || 0;
      const remaining = b.allowance - b.used - pending;
      return {
        ...b,
        pending,
        remaining: Math.max(0, remaining),
      };
    });
  }

  async createLeaveRequest(actor: AuthenticatedUser, input: z.infer<typeof createLeaveRequestSchema>) {
    const isDemo = Boolean(actor.isDemo);
    const weekdays = this.calculateWeekdays(input.startDate, input.endDate);
    if (weekdays <= 0) {
      throw {
        status: 400,
        code: 'NO_WEEKDAYS',
        message: 'Selected date range contains no weekdays (Monday to Friday).',
      };
    }

    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T23:59:59.999Z`);
    const targetYear = start.getUTCFullYear();

    // Business rule: Block overlapping requests for the same user
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        userId: actor.userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap) {
      throw {
        status: 409,
        code: 'OVERLAPPING_LEAVE_REQUEST',
        message: 'You already have an active leave request overlapping these dates.',
      };
    }

    // Business rule: Remaining = allowance minus approved used minus pending. Block requests that exceed balance.
    const balances = await this.getLeaveBalancesWithRemaining(actor.userId, targetYear);
    const targetBalance = balances.find((b) => b.leaveTypeId === input.leaveTypeId);

    if (!targetBalance) {
      throw {
        status: 404,
        code: 'BALANCE_NOT_FOUND',
        message: 'No leave balance record found for this leave type.',
      };
    }

    if (targetBalance.remaining < weekdays) {
      throw {
        status: 422,
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient leave balance. Requested ${weekdays} days, but only ${targetBalance.remaining} remaining.`,
      };
    }

    // Business rule: OWNER leave is auto-approved
    if (actor.role === 'OWNER') {
      const result = await prisma.$transaction(async (tx) => {
        const leave = await tx.leaveRequest.create({
          data: {
            userId: actor.userId,
            leaveTypeId: input.leaveTypeId,
            startDate: start,
            endDate: end,
            daysCount: weekdays,
            status: 'APPROVED',
            reason: input.reason,
            decidedById: actor.userId,
            decidedAt: new Date(),
          },
        });

        await tx.leaveBalance.update({
          where: { id: targetBalance.id },
          data: { used: { increment: weekdays } },
        });

        return leave;
      });

      await logAudit(actor.userId, 'leave:create-auto-approved', 'LeaveRequest', result.id, null, {
        daysCount: weekdays,
        leaveTypeId: input.leaveTypeId,
      });

      return result;
    }

    // Normal submission (PENDING)
    const leave = await prisma.leaveRequest.create({
      data: {
        userId: actor.userId,
        leaveTypeId: input.leaveTypeId,
        startDate: start,
        endDate: end,
        daysCount: weekdays,
        status: 'PENDING',
        reason: input.reason,
      },
      include: {
        leaveType: true,
      },
    });

    await logAudit(actor.userId, 'leave:request', 'LeaveRequest', leave.id, null, {
      daysCount: weekdays,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    // Notify approver within the SAME demo/real scope:
    // HR_MANAGER requests go to OWNER.
    // EMPLOYEE and other managers go to HR_MANAGER.
    if (actor.role === 'HR_MANAGER') {
      const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isDemo, isActive: true } });
      if (owner) {
        await notify(
          owner.id,
          'LEAVE',
          `HR Manager ${actor.name} requested ${weekdays} days leave: "${input.reason}"`,
          '/leave'
        );
      }
    } else {
      const hrManagers = await prisma.user.findMany({ where: { role: 'HR_MANAGER', isDemo, isActive: true } });
      for (const hr of hrManagers) {
        await notify(
          hr.id,
          'LEAVE',
          `${actor.name} requested ${weekdays} days leave: "${input.reason}"`,
          '/leave'
        );
      }
    }

    return leave;
  }

  async approveLeaveRequest(actor: AuthenticatedUser, requestId: string) {
    const isDemo = Boolean(actor.isDemo);
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true, leaveType: true },
    });

    if (!request) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Leave request not found.' };
    }
    assertSameDemoScope(isDemo, request.user.isDemo, 'Leave request');

    if (request.status !== 'PENDING') {
      throw { status: 400, code: 'NOT_PENDING', message: `Cannot approve request with status ${request.status}.` };
    }

    // Business rule: Nobody approves their own
    if (actor.userId === request.userId) {
      throw {
        status: 403,
        code: 'CANNOT_APPROVE_OWN',
        message: 'You cannot approve your own leave request.',
      };
    }

    // Business rule: Approval chain:
    // EMPLOYEE and other managers go to HR_MANAGER;
    // HR_MANAGER goes to OWNER;
    // Owner can override any.
    if (actor.role !== 'OWNER') {
      if (actor.role === 'HR_MANAGER') {
        if (request.user.role === 'HR_MANAGER' || request.user.role === 'OWNER') {
          throw {
            status: 403,
            code: 'INSUFFICIENT_AUTHORITY',
            message: 'HR Manager cannot approve leave for another HR Manager or the Owner.',
          };
        }
      } else {
        throw { status: 403, code: 'FORBIDDEN', message: 'You do not have permission to approve leaves.' };
      }
    }

    const year = request.startDate.getUTCFullYear();

    // Business rule: Approval runs in ONE transaction:
    // re-check balance, mark approved, deduct balance, audit log, notification.
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
      });

      if (!balance) {
        throw { status: 404, code: 'BALANCE_NOT_FOUND', message: 'Employee leave balance record not found.' };
      }

      // Re-check remaining balance
      if (balance.allowance - balance.used < request.daysCount) {
        throw {
          status: 422,
          code: 'INSUFFICIENT_BALANCE',
          message: 'Employee does not have enough remaining balance to approve this leave.',
        };
      }

      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          decidedById: actor.userId,
          decidedAt: new Date(),
        },
      });

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { increment: request.daysCount } },
      });

      return updated;
    });

    await logAudit(actor.userId, 'leave:approve', 'LeaveRequest', requestId, null, {
      daysCount: request.daysCount,
      employeeId: request.userId,
    });

    await notify(
      request.userId,
      'LEAVE',
      `Your leave request for ${request.daysCount} days (${request.leaveType.name}) has been APPROVED.`,
      '/leave'
    );

    return result;
  }

  async rejectLeaveRequest(actor: AuthenticatedUser, requestId: string, input: z.infer<typeof rejectLeaveSchema>) {
    const isDemo = Boolean(actor.isDemo);
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true, leaveType: true },
    });

    if (!request) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Leave request not found.' };
    }
    assertSameDemoScope(isDemo, request.user.isDemo, 'Leave request');

    if (request.status !== 'PENDING') {
      throw { status: 400, code: 'NOT_PENDING', message: `Cannot reject request with status ${request.status}.` };
    }

    // Business rule: Nobody approves/rejects their own
    if (actor.userId === request.userId) {
      throw {
        status: 403,
        code: 'CANNOT_DECIDE_OWN',
        message: 'You cannot decide your own leave request.',
      };
    }

    if (actor.role !== 'OWNER') {
      if (actor.role === 'HR_MANAGER') {
        if (request.user.role === 'HR_MANAGER' || request.user.role === 'OWNER') {
          throw {
            status: 403,
            code: 'INSUFFICIENT_AUTHORITY',
            message: 'HR Manager cannot decide leave for HR Manager or Owner.',
          };
        }
      } else {
        throw { status: 403, code: 'FORBIDDEN', message: 'You do not have permission to reject leaves.' };
      }
    }

    // Business rule: Rejection requires a reason
    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        decisionReason: input.decisionReason,
        decidedById: actor.userId,
        decidedAt: new Date(),
      },
    });

    await logAudit(actor.userId, 'leave:reject', 'LeaveRequest', requestId, null, {
      decisionReason: input.decisionReason,
    });

    await notify(
      request.userId,
      'LEAVE',
      `Your leave request was REJECTED: "${input.decisionReason}"`,
      '/leave'
    );

    return updated;
  }

  async cancelLeaveRequest(actor: AuthenticatedUser, requestId: string) {
    const isDemo = Boolean(actor.isDemo);
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { isDemo: true } } },
    });

    if (!request) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Leave request not found.' };
    }
    assertSameDemoScope(isDemo, request.user.isDemo, 'Leave request');

    if (request.userId !== actor.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only cancel your own leave requests.' };
    }

    // Business rule: Requester can cancel only while PENDING
    if (request.status !== 'PENDING') {
      throw {
        status: 400,
        code: 'CANNOT_CANCEL',
        message: 'You can only cancel a leave request while it is PENDING.',
      };
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    await logAudit(actor.userId, 'leave:cancel', 'LeaveRequest', requestId, null, null);

    return updated;
  }

  async listApprovalQueue(actor: AuthenticatedUser) {
    const isDemo = Boolean(actor.isDemo);
    // Approval chain:
    // EMPLOYEE & other managers -> HR_MANAGER
    // HR_MANAGER -> OWNER
    // Owner can override any
    let userFilter: Prisma.UserWhereInput = { isDemo };

    if (actor.role === 'HR_MANAGER') {
      userFilter = { isDemo, role: { notIn: ['HR_MANAGER', 'OWNER'] } };
    } else if (actor.role !== 'OWNER') {
      return [];
    }

    const pendingRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
        userId: { not: actor.userId }, // cannot approve own
        user: userFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: { select: { name: true } },
            // Preview: tasks & deadlines for approver
            assignedTasks: {
              where: { status: { in: ['TODO', 'IN_PROGRESS'] }, project: { isDemo } },
              select: { id: true, title: true, dueDate: true, priority: true, project: { select: { name: true } } },
              take: 5,
            },
          },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return pendingRequests;
  }

  async listMyLeaveRequests(userId: string) {
    return prisma.leaveRequest.findMany({
      where: { userId },
      include: { leaveType: true, decidedBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllLeaveRequests(query: z.infer<typeof leaveQuerySchema>, isDemo = false) {
    const where: Prisma.LeaveRequestWhereInput = {
      user: { isDemo: Boolean(isDemo) },
    };
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    return prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        leaveType: true,
        decidedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const leaveService = new LeaveService();
