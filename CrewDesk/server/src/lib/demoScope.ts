import { prisma } from './prisma.js';

/**
 * Central Demo vs. Real Data Isolation Helper.
 * Ensures bidirectional separation:
 * - Demo users (isDemo === true) can only read/write isDemo === true records.
 * - Real users (isDemo === false) can only read/write isDemo === false records.
 * - Any single-record lookup or foreign-key reference that crosses scope throws 404 NOT_FOUND.
 */

export function scopeRoot(isDemo: boolean): { isDemo: boolean } {
  return { isDemo: Boolean(isDemo) };
}

export function scopeByUserRelation(isDemo: boolean): { user: { isDemo: boolean } } {
  return { user: { isDemo: Boolean(isDemo) } };
}

export function scopeByProjectRelation(isDemo: boolean): { project: { isDemo: boolean } } {
  return { project: { isDemo: Boolean(isDemo) } };
}

export function scopeByClientRelation(isDemo: boolean): { client: { isDemo: boolean } } {
  return { client: { isDemo: Boolean(isDemo) } };
}

export function scopeByRecordedByRelation(isDemo: boolean): { recordedBy: { isDemo: boolean } } {
  return { recordedBy: { isDemo: Boolean(isDemo) } };
}

export function scopeAuditLogs(isDemo: boolean) {
  if (isDemo) {
    return { actor: { isDemo: true } };
  }
  return {
    OR: [{ actorId: null }, { actor: { isDemo: false } }],
  };
}

export function assertSameDemoScope(
  recordOrIsDemo: { isDemo: boolean } | boolean | null | undefined,
  actorIsDemo: boolean,
  entityName = 'Record'
): void {
  if (recordOrIsDemo === null || recordOrIsDemo === undefined) {
    throw { status: 404, code: 'NOT_FOUND', message: `${entityName} not found.` };
  }
  const recordIsDemo =
    typeof recordOrIsDemo === 'boolean' ? recordOrIsDemo : Boolean(recordOrIsDemo.isDemo);
  if (recordIsDemo !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: `${entityName} not found.` };
  }
}

export async function verifyScopedUser(userId: string, actorIsDemo: boolean, label = 'User') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, isDemo: true, departmentId: true },
  });
  if (!user || Boolean(user.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: `${label} not found.` };
  }
  return user;
}

export async function verifyScopedClient(clientId: string, actorIsDemo: boolean) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!client || Boolean(client.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Client not found.' };
  }
  return client;
}

export async function verifyScopedProject(projectId: string, actorIsDemo: boolean) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      manager: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        },
      },
      milestones: {
        orderBy: { dueDate: 'asc' },
      },
    },
  });
  if (!project || Boolean(project.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Project not found.' };
  }
  return project;
}

export async function verifyScopedTask(taskId: string, actorIsDemo: boolean) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          managerId: true,
          isDemo: true,
          members: { select: { userId: true } },
        },
      },
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!task || Boolean(task.project.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Task not found.' };
  }
  return task;
}

export async function verifyScopedAttendance(attendanceId: string, actorIsDemo: boolean) {
  const record = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { user: { select: { id: true, isDemo: true } } },
  });
  if (!record || Boolean(record.user.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Attendance record not found.' };
  }
  return record;
}

export async function verifyScopedLeaveRequest(requestId: string, actorIsDemo: boolean) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { user: true, leaveType: true },
  });
  if (!request || Boolean(request.user.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Leave request not found.' };
  }
  return request;
}

export async function verifyScopedInventoryItem(itemId: string, actorIsDemo: boolean, label = 'Inventory item') {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: { assignedUser: true },
  });
  if (!item || Boolean(item.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: `${label} not found.` };
  }
  return item;
}

export async function verifyScopedInvoice(invoiceId: string, actorIsDemo: boolean) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, client: true },
  });
  if (!invoice || Boolean(invoice.client.isDemo) !== Boolean(actorIsDemo)) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Invoice not found.' };
  }
  return invoice;
}
