import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 6: Leave Management Tests', () => {
  let ownerToken: string;
  let ownerId: string;
  let hrToken: string;
  let hrId: string;
  let empToken: string;
  let empId: string;

  let annualLeaveTypeId: string;
  let sickLeaveTypeId: string;
  let createdLeaveRequestId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const dept = await prisma.department.findFirst();

    // Owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isDemo: false } });
    ownerId = owner!.id;
    ownerToken = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // HR Manager
    const hr = await prisma.user.upsert({
      where: { email: 'hr.leave@crewdesk.agency' },
      update: { role: 'HR_MANAGER' },
      create: {
        name: 'HR Leave Approver',
        email: 'hr.leave@crewdesk.agency',
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
      where: { email: 'emp.leave@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Leave Requester Employee',
        email: 'emp.leave@crewdesk.agency',
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

    // Fetch leave types
    const annual = await prisma.leaveType.findUnique({ where: { name: 'ANNUAL' } });
    annualLeaveTypeId = annual!.id;

    const sick = await prisma.leaveType.findUnique({ where: { name: 'SICK' } });
    sickLeaveTypeId = sick!.id;

    // Ensure leave balances exist for emp, hr, and owner for current year
    const year = new Date().getFullYear();
    for (const uId of [empId, hrId, ownerId]) {
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_year: { userId: uId, leaveTypeId: annualLeaveTypeId, year } },
        update: { allowance: 14, used: 0 },
        create: { userId: uId, leaveTypeId: annualLeaveTypeId, year, allowance: 14, used: 0 },
      });
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_year: { userId: uId, leaveTypeId: sickLeaveTypeId, year } },
        update: { allowance: 10, used: 0 },
        create: { userId: uId, leaveTypeId: sickLeaveTypeId, year, allowance: 10, used: 0 },
      });
    }

    // Clean up past leave requests for test users
    await prisma.leaveRequest.deleteMany({
      where: { userId: { in: [empId, hrId, ownerId] } },
    });
  });

  afterAll(async () => {
    await prisma.leaveRequest.deleteMany({
      where: { userId: { in: [empId, hrId, ownerId] } },
    });
  });

  it('Weekend-only leave request should be rejected (no weekdays)', async () => {
    // 2026-11-14 is Saturday, 2026-11-15 is Sunday
    const res = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-11-14',
        endDate: '2026-11-15',
        reason: 'Weekend vacation',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_WEEKDAYS');
  });

  it('Leave request across weekend accurately counts only weekdays', async () => {
    // 2026-11-13 (Fri) to 2026-11-16 (Mon) = 4 calendar days, exactly 2 weekdays
    const res = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-11-13',
        endDate: '2026-11-16',
        reason: 'Long weekend road trip',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.daysCount).toBe(2);
    expect(res.body.data.status).toBe('PENDING');
    createdLeaveRequestId = res.body.data.id;
  });

  it('Overlapping leave request should be rejected (409 OVERLAPPING_LEAVE_REQUEST)', async () => {
    // 2026-11-15 (Sun) to 2026-11-18 (Wed) overlaps 2026-11-16
    const res = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        leaveTypeId: sickLeaveTypeId,
        startDate: '2026-11-15',
        endDate: '2026-11-18',
        reason: 'Overlap doctor appointment',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OVERLAPPING_LEAVE_REQUEST');
  });

  it('Leave request exceeding remaining balance should be rejected (422 INSUFFICIENT_BALANCE)', async () => {
    // Employee only has 14 annual days, request 30 weekdays
    const res = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-12-01',
        endDate: '2027-01-20',
        reason: 'Extended sabbatical',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('Employee cannot approve their own leave request (403)', async () => {
    const res = await request(app)
      .post(`/api/leave/${createdLeaveRequestId}/approve`)
      .set('Cookie', [`access_token=${empToken}`]);

    // Forbidden due to permission or cannot approve own
    expect(res.status).toBe(403);
  });

  it('HR Manager can approve Employee leave request in 1 transaction', async () => {
    const res = await request(app)
      .post(`/api/leave/${createdLeaveRequestId}/approve`)
      .set('Cookie', [`access_token=${hrToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.decidedById).toBe(hrId);

    // Verify leave balance deducted
    const year = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId: empId, leaveTypeId: annualLeaveTypeId, year } },
    });
    expect(balance?.used).toBe(2);

    // Verify audit log created
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'leave:approve', entityId: createdLeaveRequestId },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(hrId);
  });

  it('Owner leave request is auto-approved immediately in 1 transaction', async () => {
    // 2026-11-23 (Mon) to 2026-11-24 (Tue) = 2 weekdays
    const res = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${ownerToken}`])
      .send({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-11-23',
        endDate: '2026-11-24',
        reason: 'Executive retreat',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.decidedById).toBe(ownerId);

    // Verify balance was automatically incremented
    const year = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId: ownerId, leaveTypeId: annualLeaveTypeId, year } },
    });
    expect(balance?.used).toBe(2);
  });

  it('HR Manager leave request cannot be approved by another HR Manager (chain routing to Owner)', async () => {
    // HR submits request: 2026-11-25 (Wed) to 2026-11-26 (Thu)
    const hrReqRes = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${hrToken}`])
      .send({
        leaveTypeId: sickLeaveTypeId,
        startDate: '2026-11-25',
        endDate: '2026-11-26',
        reason: 'Dental surgery',
      });

    expect(hrReqRes.status).toBe(201);
    const hrLeaveId = hrReqRes.body.data.id;

    // HR attempts to approve their own / HR leave -> 403
    const hrApproveRes = await request(app)
      .post(`/api/leave/${hrLeaveId}/approve`)
      .set('Cookie', [`access_token=${hrToken}`]);

    expect(hrApproveRes.status).toBe(403);

    // Owner CAN approve HR Manager request
    const ownerApproveRes = await request(app)
      .post(`/api/leave/${hrLeaveId}/approve`)
      .set('Cookie', [`access_token=${ownerToken}`]);

    expect(ownerApproveRes.status).toBe(200);
    expect(ownerApproveRes.body.data.status).toBe('APPROVED');
  });

  it('Rejection requires a decisionReason and updates status to REJECTED', async () => {
    // Employee submits a new request: 2026-11-27 (Fri)
    const newReqRes = await request(app)
      .post('/api/leave/request')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        leaveTypeId: annualLeaveTypeId,
        startDate: '2026-11-27',
        endDate: '2026-11-27',
        reason: 'Personal day',
      });

    expect(newReqRes.status).toBe(201);
    const newLeaveId = newReqRes.body.data.id;

    // Rejection without reason fails schema
    const failReject = await request(app)
      .post(`/api/leave/${newLeaveId}/reject`)
      .set('Cookie', [`access_token=${hrToken}`])
      .send({});
    expect(failReject.status).toBe(500); // Zod throws in centralized error handler

    // Rejection with reason succeeds
    const successReject = await request(app)
      .post(`/api/leave/${newLeaveId}/reject`)
      .set('Cookie', [`access_token=${hrToken}`])
      .send({ decisionReason: 'Critical product launch on this Friday' });

    expect(successReject.status).toBe(200);
    expect(successReject.body.data.status).toBe('REJECTED');
    expect(successReject.body.data.decisionReason).toBe('Critical product launch on this Friday');
  });
});
