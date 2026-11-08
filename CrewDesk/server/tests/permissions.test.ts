import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 11: Enterprise Role-Based Access Control (RBAC) Permission Matrix', () => {
  let ownerToken: string;
  let hrToken: string;
  let pmToken: string;
  let financeToken: string;
  let inventoryToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // Retrieve the 6 seeded demo users
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@crewdesk.agency' } });
    const hr = await prisma.user.findUniqueOrThrow({ where: { email: 'hr@crewdesk.agency' } });
    const pm = await prisma.user.findUniqueOrThrow({ where: { email: 'pm@crewdesk.agency' } });
    const finance = await prisma.user.findUniqueOrThrow({ where: { email: 'finance@crewdesk.agency' } });
    const inv = await prisma.user.findUniqueOrThrow({ where: { email: 'inventory@crewdesk.agency' } });
    const emp = await prisma.user.findUniqueOrThrow({ where: { email: 'employee@crewdesk.agency' } });

    ownerToken = signAccessToken({ userId: owner.id, email: owner.email, role: 'OWNER', mustChangePassword: false });
    hrToken = signAccessToken({ userId: hr.id, email: hr.email, role: 'HR_MANAGER', mustChangePassword: false });
    pmToken = signAccessToken({ userId: pm.id, email: pm.email, role: 'PROJECT_MANAGER', mustChangePassword: false });
    financeToken = signAccessToken({ userId: finance.id, email: finance.email, role: 'FINANCE_MANAGER', mustChangePassword: false });
    inventoryToken = signAccessToken({ userId: inv.id, email: inv.email, role: 'INVENTORY_MANAGER', mustChangePassword: false });
    employeeToken = signAccessToken({ userId: emp.id, email: emp.email, role: 'EMPLOYEE', mustChangePassword: false });
  });

  // 1. EMPLOYEE RESTRICTIONS
  describe('Employee Role Boundaries', () => {
    it('Employee cannot create other employees', async () => {
      const res = await request(app)
        .post('/api/users/employee')
        .set('Cookie', [`access_token=${employeeToken}`])
        .send({
          name: 'Hacker Emp',
          email: 'hacker@crewdesk.agency',
          departmentId: 'any-id',
          title: 'Dev',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Employee cannot create clients', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Cookie', [`access_token=${employeeToken}`])
        .send({ name: 'Unauthorized Client', email: 'unauth@test.com' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Employee cannot access financial invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Cookie', [`access_token=${employeeToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Employee cannot access audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', [`access_token=${employeeToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Employee cannot manage inventory items', async () => {
      const res = await request(app)
        .post('/api/inventory/items')
        .set('Cookie', [`access_token=${employeeToken}`])
        .send({ name: 'Stolen Laptop', kind: 'ASSET', category: 'Workstation' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // 2. PROJECT MANAGER RESTRICTIONS
  describe('Project Manager Role Boundaries', () => {
    it('Project Manager cannot access invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Cookie', [`access_token=${pmToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Project Manager cannot record financial expenses directly without permission', async () => {
      const res = await request(app)
        .post('/api/finance/expenses')
        .set('Cookie', [`access_token=${pmToken}`])
        .send({
          category: 'SOFTWARE',
          amount: '500.00',
          description: 'Software',
          date: new Date().toISOString(),
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Project Manager cannot view audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', [`access_token=${pmToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // 3. FINANCE MANAGER RESTRICTIONS
  describe('Finance Manager Role Boundaries', () => {
    it('Finance Manager cannot manage inventory or assign assets', async () => {
      const res = await request(app)
        .post('/api/inventory/items')
        .set('Cookie', [`access_token=${financeToken}`])
        .send({ name: 'Monitor', kind: 'ASSET', category: 'Monitors' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Finance Manager cannot create employees', async () => {
      const res = await request(app)
        .post('/api/users/employee')
        .set('Cookie', [`access_token=${financeToken}`])
        .send({ name: 'Finance Emp', email: 'femp@crewdesk.agency', departmentId: 'any', title: 'Dev' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // 4. HR MANAGER RESTRICTIONS
  describe('HR Manager Role Boundaries', () => {
    it('HR Manager cannot create or manage invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Cookie', [`access_token=${hrToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('HR Manager cannot update company settings (Owner-only)', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Cookie', [`access_token=${hrToken}`])
        .send({ companyName: 'HR Controlled Agency' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('HR Manager cannot create Manager roles (Owner-only)', async () => {
      const res = await request(app)
        .post('/api/users/manager')
        .set('Cookie', [`access_token=${hrToken}`])
        .send({
          name: 'Rogue Manager',
          email: 'rogue@crewdesk.agency',
          role: 'PROJECT_MANAGER',
          departmentId: 'dept',
          title: 'Manager',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // 5. INVENTORY MANAGER RESTRICTIONS
  describe('Inventory Manager Role Boundaries', () => {
    it('Inventory Manager cannot view financial reports or invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Cookie', [`access_token=${inventoryToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Inventory Manager cannot view system audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', [`access_token=${inventoryToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // 6. OWNER PRIVILEGES
  describe('Owner Global Authority', () => {
    it('Owner can access company settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBeDefined();
    });

    it('Owner can view full audit log trail', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.logs)).toBe(true);
    });

    it('Owner can access financial overview', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Cookie', [`access_token=${ownerToken}`]);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
