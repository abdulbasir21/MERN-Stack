import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { Prisma } from '@prisma/client';
import {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from './schemas.js';
import { z } from 'zod';
import { AuthenticatedUser } from '../../middleware/auth.js';

export class ProjectService {
  // ==========================================
  // Clients CRUD
  // ==========================================
  async listClients() {
    return prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { projects: true } },
      },
    });
  }

  async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            deadline: true,
            budget: true,
            manager: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!client) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Client not found' };
    }

    return client;
  }

  async createClient(actorId: string, input: z.infer<typeof createClientSchema>) {
    const existing = await prisma.client.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw { status: 409, code: 'CONFLICT', message: 'Client with this email already exists' };
    }

    const client = await prisma.client.create({
      data: {
        ...input,
        email: input.email.toLowerCase(),
      },
    });

    await logAudit(actorId, 'client:create', 'Client', client.id, null, { name: client.name });
    return client;
  }

  async updateClient(actorId: string, id: string, input: z.infer<typeof updateClientSchema>) {
    const client = await prisma.client.update({
      where: { id },
      data: input,
    });

    await logAudit(actorId, 'client:update', 'Client', id);
    return client;
  }

  // ==========================================
  // Projects CRUD (Scope Enforcement)
  // ==========================================
  async listProjects(user: AuthenticatedUser) {
    const where: Prisma.ProjectWhereInput = {};

    // Scope check: Employees see only their assigned projects
    if (user.role === 'EMPLOYEE') {
      where.members = {
        some: { userId: user.userId },
      };
    }

    return prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, company: true } },
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
  }

  async getProjectById(user: AuthenticatedUser, projectId: string) {
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

    if (!project) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };
    }

    // Scope check: Employee can only see assigned projects
    if (user.role === 'EMPLOYEE') {
      const isMember = project.members.some((m) => m.userId === user.userId);
      if (!isMember) {
        throw { status: 403, code: 'FORBIDDEN', message: 'Access denied. You are not a member of this project.' };
      }
    }

    return project;
  }

  async createProject(actorId: string, input: z.infer<typeof createProjectSchema>) {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        clientId: input.clientId,
        description: input.description,
        startDate: new Date(input.startDate),
        deadline: new Date(input.deadline),
        budget: new Prisma.Decimal(input.budget),
        status: input.status,
        managerId: input.managerId,
      },
      include: {
        client: true,
        manager: { select: { id: true, name: true } },
      },
    });

    await logAudit(actorId, 'project:create', 'Project', project.id, null, { name: project.name });
    return project;
  }

  async updateProject(user: AuthenticatedUser, projectId: string, input: z.infer<typeof updateProjectSchema>) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };
    }

    // Scope check: Project Manager can ONLY update projects they manage. Owner can update any.
    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only edit projects that are assigned to you.' };
    }

    const updateData: Prisma.ProjectUpdateInput = {};
    if (input.name) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.startDate) updateData.startDate = new Date(input.startDate);
    if (input.deadline) updateData.deadline = new Date(input.deadline);
    if (input.budget !== undefined) updateData.budget = new Prisma.Decimal(input.budget);
    if (input.status) updateData.status = input.status;
    if (input.managerId) updateData.manager = { connect: { id: input.managerId } };

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    await logAudit(user.userId, 'project:update', 'Project', projectId);
    return updated;
  }

  // ==========================================
  // Team Allocation
  // ==========================================
  async addMember(user: AuthenticatedUser, projectId: string, input: z.infer<typeof addMemberSchema>) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };

    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only manage teams for projects you manage.' };
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: input.userId,
        role: input.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAudit(user.userId, 'team:add-member', 'ProjectMember', member.id, null, {
      projectId,
      userId: input.userId,
    });
    return member;
  }

  async removeMember(user: AuthenticatedUser, projectId: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };

    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only manage teams for projects you manage.' };
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    await logAudit(user.userId, 'team:remove-member', 'ProjectMember', null, { projectId, userId });
    return { success: true };
  }

  // ==========================================
  // Milestones
  // ==========================================
  async createMilestone(user: AuthenticatedUser, projectId: string, input: z.infer<typeof createMilestoneSchema>) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };

    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only manage milestones for projects you manage.' };
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: input.title,
        dueDate: new Date(input.dueDate),
      },
    });

    await logAudit(user.userId, 'milestone:create', 'Milestone', milestone.id);
    return milestone;
  }

  async updateMilestone(
    user: AuthenticatedUser,
    projectId: string,
    milestoneId: string,
    input: z.infer<typeof updateMilestoneSchema>
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw { status: 404, code: 'NOT_FOUND', message: 'Project not found' };

    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only manage milestones for projects you manage.' };
    }

    const updateData: Prisma.MilestoneUpdateInput = {};
    if (input.title) updateData.title = input.title;
    if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
    if (input.status) {
      updateData.status = input.status;
      if (input.status === 'DONE') {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    await logAudit(user.userId, 'milestone:update', 'Milestone', milestoneId);
    return milestone;
  }
}

export const projectService = new ProjectService();
