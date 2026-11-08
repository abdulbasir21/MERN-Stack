import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 10: Role-Specific Dashboards & Reports', () => {
  let ownerToken: string;
  let hrToken: string;
  let pmToken: string;
  let financeToken: string;
  let inventoryToken: string;
  let empToken: string;

  beforeAll(async () => {
    // 1. Owner
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@crewdesk.agency' } });
    ownerToken = signAccessToken({
      userId: owner.id,
      email: owner.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // 2. HR
    const hr = await prisma.user.findUniqueOrThrow({ where: { email: 'hr@crewdesk.agency' } });
    hrToken = signAccessToken({
      userId: hr.id,
      email: hr.email,
      role: 'HR_MANAGER',
      mustChangePassword: false,
    });

    // 3. PM
    const pm = await prisma.user.findUniqueOrThrow({ where: { email: 'pm@crewdesk.agency' } });
    pmToken = signAccessToken({
      userId: pm.id,
      email: pm.email,
      role: 'PROJECT_MANAGER',
      mustChangePassword: false,
    });

    // 4. Finance
    const finance = await prisma.user.findUniqueOrThrow({ where: { email: 'finance@crewdesk.agency' } });
    financeToken = signAccessToken({
      userId: finance.id,
      email: finance.email,
      role: 'FINANCE_MANAGER',
      mustChangePassword: false,
    });

    // 5. Inventory
    const inv = await prisma.user.findUniqueOrThrow({ where: { email: 'inventory@crewdesk.agency' } });
    inventoryToken = signAccessToken({
      userId: inv.id,
      email: inv.email,
      role: 'INVENTORY_MANAGER',
      mustChangePassword: false,
    });

    // 6. Employee
    const emp = await prisma.user.findUniqueOrThrow({ where: { email: 'employee@crewdesk.agency' } });
    empToken = signAccessToken({
      userId: emp.id,
      email: emp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });
  });

  it('unauthenticated request should return 401', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('Owner should receive enterprise executive metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`access_token=${ownerToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('OWNER');
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.activeClients).toBeTypeOf('number');
    expect(res.body.data.metrics.totalInvoiced).toBeTypeOf('string');
    expect(res.body.data.metrics.netRevenue).toBeTypeOf('string');
    expect(Array.isArray(res.body.data.recentAudit)).toBe(true);
  });

  it('HR Manager should receive workforce & attendance metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`access_token=${hrToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('HR_MANAGER');
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totalHeadcount).toBeTypeOf('number');
    expect(res.body.data.metrics.todayPresent).toBeTypeOf('number');
    expect(Array.isArray(res.body.data.departments)).toBe(true);
  });

  it('Project Manager should receive portfolio & milestone metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`access_token=${pmToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('PROJECT_MANAGER');
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.managedProjectsCount).toBeTypeOf('number');
    expect(res.body.data.metrics.completionRate).toBeTypeOf('number');
    expect(Array.isArray(res.body.data.projects)).toBe(true);
  });

  it('Finance Manager should receive invoices, cash flow & expense metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`access_token=${financeToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('FINANCE_MANAGER');
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totalInvoiced).toBeTypeOf('string');
    expect(res.body.data.metrics.totalOutstanding).toBeTypeOf('string');
    expect(Array.isArray(res.body.data.expenseBreakdown)).toBe(true);
  });

  it('Inventory Manager should receive assets & stock metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`access_token=${inventoryToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('INVENTORY_MANAGER');
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totalHardwareAssets).toBeTypeOf('number');
    expect(res.body.data.metrics.lowStockAlerts).toBeTypeOf('number');
    expect(Array.isArray(res.body.data.lowStockItems)).toBe(true);
  });

  it('Employee should receive personal workspace portal data', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('EMPLOYEE');
    expect(res.body.data.todayAttendance).toBeDefined();
    expect(res.body.data.todayAttendance.checkedIn).toBeTypeOf('boolean');
    expect(Array.isArray(res.body.data.leaves)).toBe(true);
    expect(Array.isArray(res.body.data.activeTasks)).toBe(true);
    expect(res.body.data.hardwareCount).toBeTypeOf('number');
  });
});
