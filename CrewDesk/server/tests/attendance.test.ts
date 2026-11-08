import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 5: Attendance Tests', () => {
  let ownerToken: string;
  let ownerId: string;
  let hrToken: string;
  let hrId: string;
  let empToken: string;
  let empId: string;
  let attendanceRecordId: string;

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

    // HR Manager
    const hr = await prisma.user.upsert({
      where: { email: 'hr.phase5@crewdesk.agency' },
      update: { role: 'HR_MANAGER' },
      create: {
        name: 'HR Attendance Tester',
        email: 'hr.phase5@crewdesk.agency',
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
      where: { email: 'emp.attendance@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Punch Employee',
        email: 'emp.attendance@crewdesk.agency',
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

    // Clean up any existing attendance for this test employee
    await prisma.attendance.deleteMany({
      where: { userId: empId },
    });
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany({
      where: { userId: empId },
    });
  });

  it('Owner should be exempt from attendance check-in', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Cookie', [`access_token=${ownerToken}`])
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OWNER_EXEMPT');
  });

  it('Employee should successfully check in', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Cookie', [`access_token=${empToken}`])
      .send({ notes: 'Arrived on time' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.userId).toBe(empId);
    expect(res.body.data.checkIn).toBeDefined();
    expect(typeof res.body.data.isLate).toBe('boolean');
    attendanceRecordId = res.body.data.id;
  });

  it('Employee cannot double check-in on the same day', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Cookie', [`access_token=${empToken}`])
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CHECKED_IN');
  });

  it('Employee can fetch today attendance status', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(attendanceRecordId);
  });

  it('Employee can successfully check out and working hours are calculated', async () => {
    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Cookie', [`access_token=${empToken}`])
      .send({ notes: 'Day complete' });

    expect(res.status).toBe(200);
    expect(res.body.data.checkOut).toBeDefined();
    expect(res.body.data.workingHours).toBeDefined();
    expect(parseFloat(res.body.data.workingHours)).toBeGreaterThanOrEqual(0);
  });

  it('Employee cannot double check-out', async () => {
    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Cookie', [`access_token=${empToken}`])
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CHECKED_OUT');
  });

  it('Employee cannot view all attendance records (forbidden)', async () => {
    const res = await request(app)
      .get('/api/attendance')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(403);
  });

  it('HR Manager can view all attendance records', async () => {
    const res = await request(app)
      .get('/api/attendance')
      .set('Cookie', [`access_token=${hrToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((r: any) => r.id === attendanceRecordId);
    expect(found).toBeDefined();
  });

  it('HR Manager can edit attendance record and audit log is created with old/new values', async () => {
    const newCheckIn = new Date('2026-11-08T09:00:00.000Z');
    const newCheckOut = new Date('2026-11-08T17:00:00.000Z');

    const res = await request(app)
      .put(`/api/attendance/${attendanceRecordId}`)
      .set('Cookie', [`access_token=${hrToken}`])
      .send({
        checkIn: newCheckIn.toISOString(),
        checkOut: newCheckOut.toISOString(),
        notes: 'HR manual adjustment',
      });

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.workingHours)).toBe(8);

    // Verify audit log has old and new values
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'attendance:edit',
        entityId: attendanceRecordId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(hrId);
    expect(audit?.oldValues).toBeDefined();
    expect(audit?.newValues).toBeDefined();
  });
});
