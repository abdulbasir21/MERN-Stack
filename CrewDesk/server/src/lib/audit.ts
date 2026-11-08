import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';

export async function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  oldValues?: unknown,
  newValues?: unknown
) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId: entityId || null,
        oldValues: oldValues ? (oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValues: newValues ? (newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    // Audit logging failure should not crash core business transactions, but log to error output
    console.error('Failed to write audit log:', error);
    return null;
  }
}
