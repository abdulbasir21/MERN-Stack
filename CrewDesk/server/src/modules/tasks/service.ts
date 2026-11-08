import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { AuthenticatedUser } from '../../middleware/auth.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskEmployeeSchema,
  createCommentSchema,
  taskQuerySchema,
} from './schemas.js';
import { z } from 'zod';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';

export class TaskService {
  async listTasks(user: AuthenticatedUser, query: z.infer<typeof taskQuerySchema>) {
    const where: Prisma.TaskWhereInput = {};

    // Scope check: Employees see only tasks assigned to them or in their assigned projects
    if (user.role === 'EMPLOYEE') {
      where.OR = [
        { assigneeId: user.userId },
        { project: { members: { some: { userId: user.userId } } } },
      ];
    }

    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status as TaskStatus;
    if (query.priority) where.priority = query.priority as TaskPriority;
    if (query.assigneeId) where.assigneeId = query.assigneeId;

    return prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        project: { select: { id: true, name: true, managerId: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getTaskById(user: AuthenticatedUser, taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            managerId: true,
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

    if (!task) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Task not found' };
    }

    // Scope check: Employee can only view if assignee or member of that project
    if (user.role === 'EMPLOYEE') {
      const isMember = task.project.members.some((m) => m.userId === user.userId);
      if (task.assigneeId !== user.userId && !isMember) {
        throw { status: 403, code: 'FORBIDDEN', message: 'Access denied to this task.' };
      }
    }

    return task;
  }

  async createTask(user: AuthenticatedUser, input: z.infer<typeof createTaskSchema>) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: { members: true },
    });

    if (!project) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };
    }

    // Scope check: PM can only create tasks on projects they manage. Owner can create anywhere.
    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only create tasks on projects you manage.' };
    }

    // Rule: Assignee MUST be a member of the project team
    const isMember = project.members.some((m) => m.userId === input.assigneeId);
    if (!isMember) {
      throw {
        status: 422,
        code: 'NOT_PROJECT_MEMBER',
        message: 'Task assignee must be an assigned member of this project.',
      };
    }

    const task = await prisma.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        createdById: user.userId,
        priority: input.priority,
        dueDate: new Date(input.dueDate),
        status: 'TODO',
        progressPercent: 0,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { name: true } },
      },
    });

    await logAudit(user.userId, 'task:create', 'Task', task.id, null, {
      title: task.title,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
    });

    // Notification to assignee
    await notify(
      task.assigneeId,
      'TASK_ASSIGNED',
      `You were assigned a new task: "${task.title}" on ${task.project.name}`,
      `/projects/${task.projectId}`
    );

    return task;
  }

  async updateTaskByManager(user: AuthenticatedUser, taskId: string, input: z.infer<typeof updateTaskSchema>) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });

    if (!task) throw { status: 404, code: 'NOT_FOUND', message: 'Task not found' };

    if (user.role === 'PROJECT_MANAGER' && task.project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only manage tasks on your assigned projects.' };
    }

    if (input.assigneeId) {
      const isMember = task.project.members.some((m) => m.userId === input.assigneeId);
      if (!isMember) {
        throw { status: 422, code: 'NOT_PROJECT_MEMBER', message: 'Assignee must be a project member.' };
      }
    }

    const updateData: Prisma.TaskUpdateInput = {};
    if (input.title) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.assigneeId) updateData.assignee = { connect: { id: input.assigneeId } };
    if (input.priority) updateData.priority = input.priority;
    if (input.status) updateData.status = input.status;
    if (input.progressPercent !== undefined) updateData.progressPercent = input.progressPercent;
    if (input.dueDate) updateData.dueDate = new Date(input.dueDate);

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await logAudit(user.userId, 'task:update', 'Task', taskId);
    return updated;
  }

  async updateTaskByEmployee(
    user: AuthenticatedUser,
    taskId: string,
    input: z.infer<typeof updateTaskEmployeeSchema>
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { managerId: true, name: true } } },
    });

    if (!task) throw { status: 404, code: 'NOT_FOUND', message: 'Task not found' };

    // Scope check: Employees can only update their own assigned tasks
    if (task.assigneeId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only update tasks assigned to you.' };
    }

    const updateData: Prisma.TaskUpdateInput = {};
    if (input.status) {
      updateData.status = input.status;
      if (input.status === 'DONE') {
        updateData.progressPercent = 100;
      }
    }
    if (input.progressPercent !== undefined) {
      updateData.progressPercent = input.progressPercent;
      if (input.progressPercent === 100) {
        updateData.status = 'DONE';
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await logAudit(user.userId, 'task:update-progress', 'Task', taskId, null, input);

    // Notify Project Manager when completed
    if (input.status === 'DONE' && task.status !== 'DONE') {
      await notify(
        task.project.managerId,
        'TASK_COMPLETED',
        `${user.name} completed task: "${task.title}" on ${task.project.name}`,
        `/projects/${task.projectId}`
      );
    }

    return updated;
  }

  async addComment(user: AuthenticatedUser, taskId: string, input: z.infer<typeof createCommentSchema>) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    });

    if (!task) throw { status: 404, code: 'NOT_FOUND', message: 'Task not found' };

    // Employee must be assignee or project member to comment
    if (user.role === 'EMPLOYEE') {
      const isMember = task.project.members.some((m) => m.userId === user.userId);
      if (task.assigneeId !== user.userId && !isMember) {
        throw { status: 403, code: 'FORBIDDEN', message: 'Cannot comment on tasks outside your projects.' };
      }
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: user.userId,
        content: input.content,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await logAudit(user.userId, 'comment:create', 'TaskComment', comment.id);
    return comment;
  }
}

export const taskService = new TaskService();
