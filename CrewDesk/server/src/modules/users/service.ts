import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { Role } from '@prisma/client';
import {
  createEmployeeSchema,
  createManagerSchema,
  changeRoleSchema,
  updateProfileSchema,
  updateEmployeeSchema,
  userQuerySchema,
} from './schemas.js';
import { z } from 'zod';

export class UserService {
  async listUsers(query: z.infer<typeof userQuerySchema>) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.role) {
      where.role = query.role as Role;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          joinDate: true,
          department: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        joinDate: true,
        department: { select: { id: true, name: true } },
        leaveBalances: {
          include: { leaveType: true },
        },
        createdAt: true,
      },
    });

    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
    }

    return user;
  }

  async createEmployee(actorId: string, input: z.infer<typeof createEmployeeSchema>) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw { status: 409, code: 'CONFLICT', message: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(input.temporaryPassword, 10);
    const currentYear = new Date().getFullYear();

    // Transaction: Create user + create leave balances for default leave types
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          role: 'EMPLOYEE',
          departmentId: input.departmentId,
          title: input.title,
          phone: input.phone || null,
          mustChangePassword: true,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          phone: true,
          departmentId: true,
          createdAt: true,
        },
      });

      const leaveTypes = await tx.leaveType.findMany();
      if (leaveTypes.length > 0) {
        await tx.leaveBalance.createMany({
          data: leaveTypes.map((lt) => ({
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
            allowance: lt.defaultAllowance,
            used: 0,
          })),
        });
      }

      return user;
    });

    await logAudit(actorId, 'employee:create', 'User', newUser.id, null, {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });

    return newUser;
  }

  async createManager(actorId: string, input: z.infer<typeof createManagerSchema>) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw { status: 409, code: 'CONFLICT', message: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(input.temporaryPassword, 10);
    const currentYear = new Date().getFullYear();

    const newManager = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          role: input.role,
          departmentId: input.departmentId,
          title: input.title,
          phone: input.phone || null,
          mustChangePassword: true,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          phone: true,
          departmentId: true,
          createdAt: true,
        },
      });

      const leaveTypes = await tx.leaveType.findMany();
      if (leaveTypes.length > 0) {
        await tx.leaveBalance.createMany({
          data: leaveTypes.map((lt) => ({
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
            allowance: lt.defaultAllowance,
            used: 0,
          })),
        });
      }

      return user;
    });

    await logAudit(actorId, 'manager:create', 'User', newManager.id, null, {
      name: newManager.name,
      email: newManager.email,
      role: newManager.role,
    });

    return newManager;
  }

  async changeRole(actorId: string, targetUserId: string, input: z.infer<typeof changeRoleSchema>) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Target user not found' };
    }

    if (target.id === actorId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'A user cannot grant themselves a new role.' };
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: input.role },
      select: { id: true, name: true, email: true, role: true },
    });

    await logAudit(actorId, 'role:change', 'User', targetUserId, { role: target.role }, { role: input.role });
    return updated;
  }

  async toggleUserActive(actorId: string, targetUserId: string, isActive: boolean) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Target user not found' };
    }

    if (target.id === actorId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Cannot deactivate your own account.' };
    }

    // If deactivating, verify no assigned assets are held, and invalidate all refresh tokens
    if (!isActive) {
      const assignedCount = await prisma.inventoryItem.count({
        where: { assignedUserId: targetUserId },
      });
      if (assignedCount > 0) {
        throw {
          status: 400,
          code: 'USER_HAS_ASSIGNED_ASSETS',
          message: `Cannot deactivate user who currently holds ${assignedCount} assigned asset(s). Return all assets first.`,
        };
      }
      await prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });

    await logAudit(
      actorId,
      isActive ? 'user:reactivate' : 'user:deactivate',
      'User',
      targetUserId,
      { isActive: target.isActive },
      { isActive }
    );

    return updated;
  }

  async updateOwnProfile(userId: string, input: z.infer<typeof updateProfileSchema>) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phone: input.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        phone: true,
        avatarUrl: true,
      },
    });

    await logAudit(userId, 'profile:update-own', 'User', userId);
    return updated;
  }

  async updateEmployee(actorId: string, targetUserId: string, input: z.infer<typeof updateEmployeeSchema>) {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: input.name,
        phone: input.phone,
        departmentId: input.departmentId,
        title: input.title,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        phone: true,
        department: { select: { id: true, name: true } },
      },
    });

    await logAudit(actorId, 'employee:update', 'User', targetUserId);
    return updated;
  }
}

export const userService = new UserService();
