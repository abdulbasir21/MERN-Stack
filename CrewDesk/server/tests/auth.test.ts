import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 1: Auth & Permissions Integration Tests', () => {
  const testUserPassword = 'TestPassword123!';
  let activeUserId: string;
  let deactivatedUserId: string;
  let mustChangeUserId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testUserPassword, 10);

    // Active Employee
    const active = await prisma.user.upsert({
      where: { email: 'employee.active@test.com' },
      update: { isActive: true, mustChangePassword: false },
      create: {
        name: 'Active Employee',
        email: 'employee.active@test.com',
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
        mustChangePassword: false,
      },
    });
    activeUserId = active.id;

    // Deactivated Employee
    const deactivated = await prisma.user.upsert({
      where: { email: 'employee.deactivated@test.com' },
      update: { isActive: false },
      create: {
        name: 'Deactivated Employee',
        email: 'employee.deactivated@test.com',
        passwordHash,
        role: 'EMPLOYEE',
        isActive: false,
        mustChangePassword: false,
      },
    });
    deactivatedUserId = deactivated.id;

    // User with mustChangePassword = true
    const mustChange = await prisma.user.upsert({
      where: { email: 'employee.mustchange@test.com' },
      update: { isActive: true, mustChangePassword: true },
      create: {
        name: 'Must Change Employee',
        email: 'employee.mustchange@test.com',
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
        mustChangePassword: true,
      },
    });
    mustChangeUserId = mustChange.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [activeUserId, deactivatedUserId, mustChangeUserId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [activeUserId, deactivatedUserId, mustChangeUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [activeUserId, deactivatedUserId, mustChangeUserId] } },
    });
  });

  it('successful login sets httpOnly access and refresh cookies and returns user info without hash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee.active@test.com', password: testUserPassword });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('employee.active@test.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
  });

  it('login fails for invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee.active@test.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('deactivated user is blocked from logging in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee.deactivated@test.com', password: testUserPassword });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('mustChangePassword blocks access to normal authenticated routes on the server', async () => {
    const token = signAccessToken({
      userId: mustChangeUserId,
      email: 'employee.mustchange@test.com',
      role: 'EMPLOYEE',
      mustChangePassword: true,
    });

    const res = await request(app)
      .get('/api/test/owner-only')
      .set('Cookie', [`access_token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('requirePermission middleware rejects employee from accessing owner-only route', async () => {
    const token = signAccessToken({
      userId: activeUserId,
      email: 'employee.active@test.com',
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    const res = await request(app)
      .get('/api/test/owner-only')
      .set('Cookie', [`access_token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('requirePermission middleware allows OWNER to access owner-only route', async () => {
    // Find or create owner token
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    expect(owner).toBeDefined();

    const token = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    const res = await request(app)
      .get('/api/test/owner-only')
      .set('Cookie', [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('Access granted');
  });
});
