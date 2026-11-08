import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';
import { notify } from '../src/lib/notify.js';

describe('Phase 9: Notifications, Audit Log Viewer & Settings Tests', () => {
  let ownerToken: string;
  let ownerId: string;
  let hrToken: string;
  let hrId: string;
  let empToken: string;
  let empId: string;

  let empNotifId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const dept = await prisma.department.findFirst();

    // Owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    ownerId = owner!.id;
    ownerToken = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // HR
    const hr = await prisma.user.upsert({
      where: { email: 'hr.system@crewdesk.agency' },
      update: { role: 'HR_MANAGER' },
      create: {
        name: 'HR System Tester',
        email: 'hr.system@crewdesk.agency',
        passwordHash,
        role: 'HR_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    hrId = hr.id;
    hrToken = signAccessToken({
      userId: hr.id,
      email: hr.email,
      role: 'HR_MANAGER',
      mustChangePassword: false,
    });

    // Employee
    const emp = await prisma.user.upsert({
      where: { email: 'emp.system@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Emp System Tester',
        email: 'emp.system@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    empId = emp.id;
    empToken = signAccessToken({
      userId: emp.id,
      email: emp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    // Seed test notification for emp
    const notif = await notify(empId, 'SYSTEM', 'Welcome to CrewDesk Enterprise ERP', '/');
    empNotifId = notif!.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: empId } });
  });

  // --- NOTIFICATIONS ---
  it('User fetches own notification list with unread flags', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((n: any) => n.id === empNotifId);
    expect(found).toBeDefined();
    expect(found.isRead).toBe(false);
  });

  it('User marks single notification as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${empNotifId}/read`)
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  it('User cannot mark another user notification as read (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${empNotifId}/read`)
      .set('Cookie', [`access_token=${hrToken}`]);

    expect(res.status).toBe(403);
  });

  it('User marks all notifications as read', async () => {
    await notify(empId, 'SYSTEM', 'Second notification', '/');

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);

    const check = await prisma.notification.findMany({ where: { userId: empId, isRead: false } });
    expect(check.length).toBe(0);
  });

  // --- AUDIT LOG VIEWER ---
  it('Owner can view central paginated audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs?page=1&limit=10')
      .set('Cookie', [`access_token=${ownerToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('logs');
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
  });

  it('Non-Owner (HR Manager) CANNOT access audit logs (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', [`access_token=${hrToken}`]);

    expect(res.status).toBe(403);
  });

  // --- COMPANY SETTINGS ---
  it('Authenticated user can read company settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('companyName');
    expect(res.body.data).toHaveProperty('timezone');
  });

  it('Non-Owner cannot update company settings (403 Forbidden)', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', [`access_token=${hrToken}`])
      .send({
        companyName: 'Hacked Agency',
        currency: 'EUR',
        timezone: 'Europe/Paris',
        officeStartTime: '10:00',
        lateGraceMinutes: 30,
      });

    expect(res.status).toBe(403);
  });

  it('Owner updates company settings with audit log tracking', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', [`access_token=${ownerToken}`])
      .send({
        companyName: 'CrewDesk Enterprise HQ',
        currency: 'USD',
        timezone: 'America/New_York',
        officeStartTime: '09:00',
        lateGraceMinutes: 20,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.companyName).toBe('CrewDesk Enterprise HQ');
    expect(res.body.data.lateGraceMinutes).toBe(20);

    // Verify audit log has old and new values
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'settings:update' },
      orderBy: { createdAt: 'desc' },
    });

    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(ownerId);
    expect(audit?.newValues).toHaveProperty('companyName', 'CrewDesk Enterprise HQ');
  });
});
