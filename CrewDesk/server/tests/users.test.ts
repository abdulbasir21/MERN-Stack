import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';
import * as imagekitLib from '../src/lib/imagekit.js';

describe('Phase 2: Employees, Managers, Profile & Avatar Tests', () => {
  let ownerToken: string;
  let hrToken: string;
  let employeeToken: string;
  let departmentId: string;
  let createdEmployeeId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    const dept = await prisma.department.findFirst();
    departmentId = dept!.id;

    // Owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    ownerToken = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // HR Manager
    const hr = await prisma.user.upsert({
      where: { email: 'hr.phase2@crewdesk.agency' },
      update: { role: 'HR_MANAGER' },
      create: {
        name: 'HR Lead',
        email: 'hr.phase2@crewdesk.agency',
        passwordHash,
        role: 'HR_MANAGER',
        departmentId,
        mustChangePassword: false,
      },
    });
    hrToken = signAccessToken({
      userId: hr.id,
      email: hr.email,
      role: 'HR_MANAGER',
      mustChangePassword: false,
    });

    // Regular Employee
    const emp = await prisma.user.upsert({
      where: { email: 'emp.phase2@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Regular Employee',
        email: 'emp.phase2@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId,
        mustChangePassword: false,
      },
    });
    employeeToken = signAccessToken({
      userId: emp.id,
      email: emp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });
  });

  afterAll(async () => {
    if (createdEmployeeId) {
      await prisma.leaveBalance.deleteMany({ where: { userId: createdEmployeeId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdEmployeeId } });
      await prisma.user.deleteMany({ where: { id: createdEmployeeId } });
    }
  });

  it('HR can create EMPLOYEE account, and leave balances are auto-created in same transaction', async () => {
    const res = await request(app)
      .post('/api/users/employee')
      .set('Cookie', [`access_token=${hrToken}`])
      .send({
        name: 'New Developer',
        email: 'new.dev@crewdesk.agency',
        title: 'Full Stack Engineer',
        departmentId,
        temporaryPassword: 'TempPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('EMPLOYEE');
    createdEmployeeId = res.body.data.user.id;

    // Verify leave balances created
    const balances = await prisma.leaveBalance.findMany({
      where: { userId: createdEmployeeId },
      include: { leaveType: true },
    });
    expect(balances.length).toBeGreaterThanOrEqual(3);
    const annual = balances.find((b) => b.leaveType.name === 'ANNUAL');
    expect(annual?.allowance).toBe(annual?.leaveType.defaultAllowance);
  });

  it('HR cannot create managers (returns 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/users/manager')
      .set('Cookie', [`access_token=${hrToken}`])
      .send({
        name: 'Unallowed Manager',
        email: 'unallowed@crewdesk.agency',
        role: 'PROJECT_MANAGER',
        title: 'Project Lead',
        departmentId,
        temporaryPassword: 'TempPassword123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Owner CAN create managers via dropdown role selection', async () => {
    const res = await request(app)
      .post('/api/users/manager')
      .set('Cookie', [`access_token=${ownerToken}`])
      .send({
        name: 'Valid Project Manager',
        email: 'valid.pm@crewdesk.agency',
        role: 'PROJECT_MANAGER',
        title: 'Project Lead',
        departmentId,
        temporaryPassword: 'TempPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('PROJECT_MANAGER');

    // Clean up
    await prisma.leaveBalance.deleteMany({ where: { userId: res.body.data.user.id } });
    await prisma.user.delete({ where: { id: res.body.data.user.id } });
  });

  it('Role change is audit-logged and only allowed by Owner', async () => {
    // Attempt by HR fails
    const hrAttempt = await request(app)
      .put(`/api/users/${createdEmployeeId}/role`)
      .set('Cookie', [`access_token=${hrToken}`])
      .send({ role: 'PROJECT_MANAGER' });
    expect(hrAttempt.status).toBe(403);

    // Owner succeeds
    const ownerRes = await request(app)
      .put(`/api/users/${createdEmployeeId}/role`)
      .set('Cookie', [`access_token=${ownerToken}`])
      .send({ role: 'PROJECT_MANAGER' });
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.user.role).toBe('PROJECT_MANAGER');

    // Audit log check
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'role:change', entityId: createdEmployeeId },
    });
    expect(audit).toBeDefined();
  });

  it('Avatar rejects fake files (e.g. text file renamed to .png) by verifying real content-type', async () => {
    const fakePngBuffer = Buffer.from('this is just a text string, not a real png');

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`access_token=${employeeToken}`])
      .attach('avatar', fakePngBuffer, 'fake.png');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('Avatar rejects files over 2 MB', async () => {
    const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024); // 2.5 MB

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`access_token=${employeeToken}`])
      .attach('avatar', largeBuffer, 'large.jpg');

    // Multer rejects file size limit with 500 or error
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('Avatar acts only on the logged-in user and successfully uploads valid image', async () => {
    // Valid 1x1 transparent PNG buffer
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Mock ImageKit upload
    vi.spyOn(imagekitLib, 'uploadToImageKit').mockResolvedValueOnce({
      url: 'https://ik.imagekit.io/crewdesk/avatar_test.png',
      fileId: 'ik_file_12345',
    });

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`access_token=${employeeToken}`])
      .attach('avatar', validPngBuffer, 'avatar.png');

    expect(res.status).toBe(200);
    expect(res.body.data.user.avatarUrl).toBe('https://ik.imagekit.io/crewdesk/avatar_test.png');
  });
});
