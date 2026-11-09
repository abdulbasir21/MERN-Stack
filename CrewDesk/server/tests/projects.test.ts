import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 3: Clients, Projects, Milestones & Team Scoping Tests', () => {
  let ownerToken: string;
  let pm1Token: string;
  let pm1Id: string;
  let pm2Token: string;
  let pm2Id: string;
  let employeeToken: string;
  let employeeId: string;
  let financeToken: string;

  let clientId: string;
  let project1Id: string; // Managed by PM1

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

    // PM 1
    const pm1 = await prisma.user.upsert({
      where: { email: 'pm1.phase3@crewdesk.agency' },
      update: { role: 'PROJECT_MANAGER' },
      create: {
        name: 'Project Manager 1',
        email: 'pm1.phase3@crewdesk.agency',
        passwordHash,
        role: 'PROJECT_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    pm1Id = pm1.id;
    pm1Token = signAccessToken({
      userId: pm1.id,
      email: pm1.email,
      role: 'PROJECT_MANAGER',
      mustChangePassword: false,
    });

    // PM 2
    const pm2 = await prisma.user.upsert({
      where: { email: 'pm2.phase3@crewdesk.agency' },
      update: { role: 'PROJECT_MANAGER' },
      create: {
        name: 'Project Manager 2',
        email: 'pm2.phase3@crewdesk.agency',
        passwordHash,
        role: 'PROJECT_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    pm2Id = pm2.id;
    pm2Token = signAccessToken({
      userId: pm2.id,
      email: pm2.email,
      role: 'PROJECT_MANAGER',
      mustChangePassword: false,
    });

    // Employee
    const emp = await prisma.user.upsert({
      where: { email: 'emp.phase3@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Team Member',
        email: 'emp.phase3@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    employeeId = emp.id;
    employeeToken = signAccessToken({
      userId: emp.id,
      email: emp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    // Finance Manager
    const fin = await prisma.user.upsert({
      where: { email: 'fin.phase3@crewdesk.agency' },
      update: { role: 'FINANCE_MANAGER' },
      create: {
        name: 'Finance Lead',
        email: 'fin.phase3@crewdesk.agency',
        passwordHash,
        role: 'FINANCE_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    financeToken = signAccessToken({
      userId: fin.id,
      email: fin.email,
      role: 'FINANCE_MANAGER',
      mustChangePassword: false,
    });

    // Create Client
    const client = await prisma.client.create({
      data: {
        name: 'Acme Corporation',
        email: 'billing@acme.corp',
        company: 'Acme Holdings',
      },
    });
    clientId = client.id;

    // Create Project assigned to PM1
    const p1 = await prisma.project.create({
      data: {
        name: 'Acme Core Mobile App',
        clientId,
        startDate: new Date('2026-01-01'),
        deadline: new Date('2026-06-30'),
        budget: 75000.0,
        managerId: pm1Id,
        status: 'ACTIVE',
      },
    });
    project1Id = p1.id;
  });

  afterAll(async () => {
    await prisma.milestone.deleteMany({ where: { projectId: project1Id } });
    await prisma.projectMember.deleteMany({ where: { projectId: project1Id } });
    await prisma.project.deleteMany({ where: { clientId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [pm1Id, pm2Id, employeeId] } } });
  });

  it('PM can view projects, and PM1 can edit their own project', async () => {
    const res = await request(app)
      .put(`/api/projects/${project1Id}`)
      .set('Cookie', [`access_token=${pm1Token}`])
      .send({ description: 'Updated by assigned manager' });

    expect(res.status).toBe(200);
  });

  it('PM2 CANNOT edit project assigned to PM1 (scope enforcement)', async () => {
    const res = await request(app)
      .put(`/api/projects/${project1Id}`)
      .set('Cookie', [`access_token=${pm2Token}`])
      .send({ description: 'Unauthorized edit attempt' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Owner CAN edit any project regardless of assigned manager', async () => {
    const res = await request(app)
      .put(`/api/projects/${project1Id}`)
      .set('Cookie', [`access_token=${ownerToken}`])
      .send({ description: 'Owner override description' });

    expect(res.status).toBe(200);
  });

  it('Finance Manager has read-only client access and cannot create/edit clients', async () => {
    // Read clients succeeds
    const readRes = await request(app)
      .get('/api/clients')
      .set('Cookie', [`access_token=${financeToken}`]);
    expect(readRes.status).toBe(200);

    // Create client blocked
    const createRes = await request(app)
      .post('/api/clients')
      .set('Cookie', [`access_token=${financeToken}`])
      .send({ name: 'Hacked Client', email: 'hack@corp.com' });
    expect(createRes.status).toBe(403);
  });

  it('Team member allocation and employee project scoping', async () => {
    // Employee tries to read project1 before being assigned -> blocked (403)
    const blockedRes = await request(app)
      .get(`/api/projects/${project1Id}`)
      .set('Cookie', [`access_token=${employeeToken}`]);
    expect(blockedRes.status).toBe(403);

    // PM1 assigns Employee to project team
    const addMemberRes = await request(app)
      .post(`/api/projects/${project1Id}/members`)
      .set('Cookie', [`access_token=${pm1Token}`])
      .send({ userId: employeeId, role: 'Frontend Specialist' });
    expect(addMemberRes.status).toBe(201);

    // Now Employee CAN view project1
    const allowedRes = await request(app)
      .get(`/api/projects/${project1Id}`)
      .set('Cookie', [`access_token=${employeeToken}`]);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.data.project.name).toBe('Acme Core Mobile App');
  });

  it('Milestone creation and status toggle', async () => {
    const createRes = await request(app)
      .post(`/api/projects/${project1Id}/milestones`)
      .set('Cookie', [`access_token=${pm1Token}`])
      .send({ title: 'Beta Release v0.9', dueDate: '2026-05-15T00:00:00.000Z' });

    expect(createRes.status).toBe(201);
    const milestoneId = createRes.body.data.milestone.id;

    // Toggle to DONE
    const updateRes = await request(app)
      .put(`/api/projects/${project1Id}/milestones/${milestoneId}`)
      .set('Cookie', [`access_token=${pm1Token}`])
      .send({ status: 'DONE' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.milestone.status).toBe('DONE');
    expect(updateRes.body.data.milestone.completedAt).toBeDefined();
  });
});
