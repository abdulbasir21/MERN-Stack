import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 4: Tasks, Assignments & Comments Tests', () => {
  let ownerToken: string;
  let pmToken: string;
  let pmId: string;
  let emp1Token: string;
  let emp1Id: string;
  let emp2Token: string;
  let emp2Id: string;

  let clientId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const dept = await prisma.department.findFirst();

    // Owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isDemo: false } });
    ownerToken = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // PM
    const pm = await prisma.user.upsert({
      where: { email: 'pm.phase4@crewdesk.agency' },
      update: { role: 'PROJECT_MANAGER' },
      create: {
        name: 'Task PM',
        email: 'pm.phase4@crewdesk.agency',
        passwordHash,
        role: 'PROJECT_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    pmId = pm.id;
    pmToken = signAccessToken({
      userId: pm.id,
      email: pm.email,
      role: 'PROJECT_MANAGER',
      mustChangePassword: false,
    });

    // Employee 1 (Assigned to project team)
    const emp1 = await prisma.user.upsert({
      where: { email: 'emp1.phase4@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Project Team Member',
        email: 'emp1.phase4@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    emp1Id = emp1.id;
    emp1Token = signAccessToken({
      userId: emp1.id,
      email: emp1.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    // Employee 2 (NOT in project team)
    const emp2 = await prisma.user.upsert({
      where: { email: 'emp2.phase4@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Outsider Employee',
        email: 'emp2.phase4@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    emp2Id = emp2.id;
    emp2Token = signAccessToken({
      userId: emp2.id,
      email: emp2.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    // Create Client & Project
    const client = await prisma.client.create({
      data: { name: 'Task Test Client', email: 'taskclient@corp.com' },
    });
    clientId = client.id;

    const proj = await prisma.project.create({
      data: {
        name: 'Task Workflow Project',
        clientId,
        startDate: new Date('2026-02-01'),
        deadline: new Date('2026-08-31'),
        budget: 45000.0,
        managerId: pmId,
        status: 'ACTIVE',
      },
    });
    projectId = proj.id;

    // Add Emp1 to project team
    await prisma.projectMember.create({
      data: { projectId, userId: emp1Id, role: 'Lead Frontend' },
    });
  });

  afterAll(async () => {
    await prisma.taskComment.deleteMany({ where: { task: { projectId } } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.projectMember.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.notification.deleteMany({ where: { userId: { in: [emp1Id, emp2Id, pmId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [pmId, emp1Id, emp2Id] } } });
  });

  it('Cannot assign task to non-member of the project (returns 422)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`access_token=${pmToken}`])
      .send({
        projectId,
        title: 'Invalid Assignment Task',
        assigneeId: emp2Id, // NOT in team
        dueDate: '2026-05-01T00:00:00.000Z',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_PROJECT_MEMBER');
  });

  it('PM creates task for team member and notification is generated', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`access_token=${pmToken}`])
      .send({
        projectId,
        title: 'Implement Auth Flow',
        description: 'Wire JWT cookie handlers',
        assigneeId: emp1Id,
        priority: 'HIGH',
        dueDate: '2026-05-10T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Implement Auth Flow');
    taskId = res.body.data.task.id;

    // Notification check for Emp1
    const notif = await prisma.notification.findFirst({
      where: { userId: emp1Id, type: 'TASK_ASSIGNED' },
    });
    expect(notif).toBeDefined();
    expect(notif?.message).toContain('Implement Auth Flow');
  });

  it('Employee 2 CANNOT update Employee 1 task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/progress`)
      .set('Cookie', [`access_token=${emp2Token}`])
      .send({ progressPercent: 50, status: 'IN_PROGRESS' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Assignee (Emp1) updates progress and marks DONE, generating PM notification', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/progress`)
      .set('Cookie', [`access_token=${emp1Token}`])
      .send({ progressPercent: 100, status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('DONE');
    expect(res.body.data.task.progressPercent).toBe(100);

    // Notification check for PM
    const pmNotif = await prisma.notification.findFirst({
      where: { userId: pmId, type: 'TASK_COMPLETED' },
    });
    expect(pmNotif).toBeDefined();
  });

  it('Team member can post comment to task thread', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Cookie', [`access_token=${emp1Token}`])
      .send({ content: 'Finished integration tests and verified in sandbox.' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toContain('Finished integration tests');
  });
});
