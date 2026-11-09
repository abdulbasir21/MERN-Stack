import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/token.js';
import { resetDemoWorkspace, CORE_DEMO_USERS } from '../src/lib/resetDemo.js';

describe('Phase 11+: Demo Account Security, Bidirectional Isolation, Caps & Reset', () => {
  const demoTokens: Record<string, string> = {};
  const demoUsers: Record<string, { id: string; email: string; name: string; role: string }> = {};

  let realOwnerToken: string;
  let realOwnerId: string;
  let realPmToken: string;
  let realPmId: string;
  let realEmpToken: string;
  let realEmpId: string;

  let realClientId: string;
  let realProjectId: string;
  let realTaskId: string;
  let realItemId: string;

  let demoClientId: string;
  let demoProjectId: string;
  let demoTaskId: string;
  let demoItemId: string;
  let demoInvoiceId: string;

  beforeAll(async () => {
    // Demo workspace is already initialized by globalSetup()

    for (const core of CORE_DEMO_USERS) {
      const u = await prisma.user.findUniqueOrThrow({ where: { email: core.email } });
      demoUsers[core.role] = { id: u.id, email: u.email, name: u.name, role: u.role };
      demoTokens[core.role] = signAccessToken({
        userId: u.id,
        email: u.email,
        role: u.role,
        mustChangePassword: false,
      });
    }

    const demoClient = await prisma.client.findFirstOrThrow({ where: { isDemo: true } });
    demoClientId = demoClient.id;

    const demoProject = await prisma.project.findFirstOrThrow({ where: { isDemo: true } });
    demoProjectId = demoProject.id;

    const demoTask = await prisma.task.findFirstOrThrow({ where: { projectId: demoProjectId } });
    demoTaskId = demoTask.id;

    const demoItem = await prisma.inventoryItem.findFirstOrThrow({ where: { isDemo: true, kind: 'ASSET' } });
    demoItemId = demoItem.id;

    const demoInvoice = await prisma.invoice.findFirstOrThrow({ where: { client: { isDemo: true } } });
    demoInvoiceId = demoInvoice.id;

    // 2. Seed non-demo (real) records in the isolated test schema to verify bidirectional isolation
    const dept = await prisma.department.findFirstOrThrow();
    const passwordHash = await bcrypt.hash('RealUserPass2026!', 10);

    const realOwner = await prisma.user.upsert({
      where: { email: 'real.owner@crewdesk.agency' },
      update: { isDemo: false, role: 'OWNER', isActive: true },
      create: {
        name: 'Real Agency Owner',
        email: 'real.owner@crewdesk.agency',
        passwordHash,
        role: 'OWNER',
        departmentId: dept.id,
        isDemo: false,
        isActive: true,
        mustChangePassword: false,
      },
    });
    realOwnerId = realOwner.id;
    realOwnerToken = signAccessToken({
      userId: realOwner.id,
      email: realOwner.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    const realPm = await prisma.user.upsert({
      where: { email: 'real.pm@crewdesk.agency' },
      update: { isDemo: false, role: 'PROJECT_MANAGER', isActive: true },
      create: {
        name: 'Real Project Manager',
        email: 'real.pm@crewdesk.agency',
        passwordHash,
        role: 'PROJECT_MANAGER',
        departmentId: dept.id,
        isDemo: false,
        isActive: true,
        mustChangePassword: false,
      },
    });
    realPmId = realPm.id;
    realPmToken = signAccessToken({
      userId: realPm.id,
      email: realPm.email,
      role: 'PROJECT_MANAGER',
      mustChangePassword: false,
    });

    const realEmp = await prisma.user.upsert({
      where: { email: 'real.emp@crewdesk.agency' },
      update: { isDemo: false, role: 'EMPLOYEE', isActive: true },
      create: {
        name: 'Real Staff Engineer',
        email: 'real.emp@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept.id,
        isDemo: false,
        isActive: true,
        mustChangePassword: false,
      },
    });
    realEmpId = realEmp.id;
    realEmpToken = signAccessToken({
      userId: realEmp.id,
      email: realEmp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    const realClient = await prisma.client.upsert({
      where: { email: 'confidential@realenterprise.io' },
      update: { isDemo: false },
      create: {
        name: 'Confidential Real Enterprise',
        email: 'confidential@realenterprise.io',
        company: 'Real Enterprise Ltd',
        isDemo: false,
      },
    });
    realClientId = realClient.id;

    const realProject = await prisma.project.create({
      data: {
        name: 'Confidential Real Project',
        clientId: realClientId,
        managerId: realPmId,
        budget: new Prisma.Decimal('250000.00'),
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        deadline: new Date('2026-12-31'),
        isDemo: false,
      },
    });
    realProjectId = realProject.id;

    await prisma.projectMember.create({
      data: {
        projectId: realProjectId,
        userId: realEmpId,
        role: 'Real Engineer',
      },
    });

    const realTask = await prisma.task.create({
      data: {
        projectId: realProjectId,
        title: 'Confidential Real Task',
        assigneeId: realEmpId,
        createdById: realPmId,
        dueDate: new Date('2026-10-01'),
      },
    });
    realTaskId = realTask.id;

    const realItem = await prisma.inventoryItem.upsert({
      where: { serialNumber: 'REAL-ASSET-SN-9999' },
      update: { isDemo: false },
      create: {
        kind: 'ASSET',
        name: 'Confidential Production Server Blade',
        category: 'Servers',
        serialNumber: 'REAL-ASSET-SN-9999',
        assetStatus: 'AVAILABLE',
        isDemo: false,
      },
    });
    realItemId = realItem.id;
  });

  afterAll(async () => {
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'demo-' } } });
    await prisma.$disconnect();
  });

  it('1. Verifies Muslim male names on the 6 core demo accounts and 12+ additional demo employees', async () => {
    const expectedCoreNames: Record<string, string> = {
      'owner@crewdesk.agency': 'Tariq Mansoor',
      'hr@crewdesk.agency': 'Adnan Qureshi',
      'pm@crewdesk.agency': 'Rashid Al-Banna',
      'finance@crewdesk.agency': 'Sohail Abbasi',
      'inventory@crewdesk.agency': 'Asim Zafar',
      'employee@crewdesk.agency': 'Zain Khalid',
    };

    for (const [email, expectedName] of Object.entries(expectedCoreNames)) {
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.name).toBe(expectedName);
      expect(user?.isDemo).toBe(true);
    }

    const totalDemoUsers = await prisma.user.count({ where: { isDemo: true } });
    expect(totalDemoUsers).toBeGreaterThanOrEqual(18); // 6 core + 12 additional employees
  });

  it('2. Concurrent demo logins issue unique JWT jtis so logging out one session never revokes another', async () => {
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@crewdesk.agency', password: 'CrewDesk2026!' });
    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@crewdesk.agency', password: 'CrewDesk2026!' });

    expect(loginA.status).toBe(200);
    expect(loginB.status).toBe(200);
    expect(loginA.body.data.user.isDemo).toBe(true);
    expect(loginA.body.data.user.name).toBe('Tariq Mansoor');

    const cookiesA = loginA.headers['set-cookie'] as unknown as string[];
    const cookiesB = loginB.headers['set-cookie'] as unknown as string[];

    // Session A logs out
    const logoutA = await request(app).post('/api/auth/logout').set('Cookie', cookiesA);
    expect(logoutA.status).toBe(200);

    // Session B can still refresh and access /api/auth/me without error
    const meB = await request(app).get('/api/auth/me').set('Cookie', cookiesB);
    expect(meB.status).toBe(200);
    expect(meB.body.data.user.email).toBe('owner@crewdesk.agency');
    expect(meB.body.data.user.isDemo).toBe(true);

    const refreshB = await request(app).post('/api/auth/refresh').set('Cookie', cookiesB);
    expect(refreshB.status).toBe(200);
  });

  it('3. Demo roles can read their permitted demo-scoped endpoints and never see real records', async () => {
    // Demo Owner reads users, projects, clients, finance, inventory, audit-logs
    const usersRes = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`]);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.data.every((u: any) => u.email !== 'real.owner@crewdesk.agency')).toBe(true);

    const clientsRes = await request(app)
      .get('/api/clients')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`]);
    expect(clientsRes.status).toBe(200);
    expect(clientsRes.body.data.every((c: any) => c.id !== realClientId)).toBe(true);

    const projectsRes = await request(app)
      .get('/api/projects')
      .set('Cookie', [`access_token=${demoTokens['PROJECT_MANAGER']}`]);
    expect(projectsRes.status).toBe(200);
    expect(projectsRes.body.data.every((p: any) => p.id !== realProjectId)).toBe(true);

    const tasksRes = await request(app)
      .get('/api/tasks')
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`]);
    expect(tasksRes.status).toBe(200);
    expect(tasksRes.body.data.every((t: any) => t.id !== realTaskId)).toBe(true);

    const invRes = await request(app)
      .get('/api/inventory/items')
      .set('Cookie', [`access_token=${demoTokens['INVENTORY_MANAGER']}`]);
    expect(invRes.status).toBe(200);
    expect(invRes.body.data.every((i: any) => i.id !== realItemId)).toBe(true);
  });

  it('4. Cross-role access by demo users returns 403 FORBIDDEN on the server', async () => {
    // Employee trying to read Finance, HR users, Inventory management, Audit logs
    const empFinance = await request(app)
      .get('/api/finance/invoices')
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`]);
    expect(empFinance.status).toBe(403);

    const empUsers = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`]);
    expect(empUsers.status).toBe(403);

    const pmAudit = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', [`access_token=${demoTokens['PROJECT_MANAGER']}`]);
    expect(pmAudit.status).toBe(403);

    const hrFinance = await request(app)
      .get('/api/finance/reports/summary')
      .set('Cookie', [`access_token=${demoTokens['HR_MANAGER']}`]);
    expect(hrFinance.status).toBe(403);
  });

  it('5. Blocked mutations return 403 DEMO_RESTRICTED for all demo roles (including Demo Owner)', async () => {
    // Password change blocked
    const pwRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`])
      .send({ currentPassword: 'CrewDesk2026!', newPassword: 'HackedPassword99!' });
    expect(pwRes.status).toBe(403);
    expect(pwRes.body.error.code).toBe('DEMO_RESTRICTED');

    // Profile update & avatar upload blocked (before Multer buffer parsing)
    const profRes = await request(app)
      .put('/api/profile')
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`])
      .send({ name: 'Renamed Demo User' });
    expect(profRes.status).toBe(403);
    expect(profRes.body.error.code).toBe('DEMO_RESTRICTED');

    const avatarRes = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`])
      .attach('avatar', Buffer.from('fake'), 'avatar.png');
    expect(avatarRes.status).toBe(403);
    expect(avatarRes.body.error.code).toBe('DEMO_RESTRICTED');

    // User/Manager creation, role change, deactivation, department creation blocked
    const createEmpRes = await request(app)
      .post('/api/users/employee')
      .set('Cookie', [`access_token=${demoTokens['HR_MANAGER']}`])
      .send({
        name: 'Blocked User',
        email: 'blocked@crewdesk.agency',
        title: 'Dev',
        departmentId: 'any',
        temporaryPassword: 'TempPassword123!',
      });
    expect(createEmpRes.status).toBe(403);
    expect(createEmpRes.body.error.code).toBe('DEMO_RESTRICTED');

    const roleRes = await request(app)
      .put(`/api/users/${demoUsers['EMPLOYEE'].id}/role`)
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`])
      .send({ role: 'PROJECT_MANAGER' });
    expect(roleRes.status).toBe(403);
    expect(roleRes.body.error.code).toBe('DEMO_RESTRICTED');

    const deactRes = await request(app)
      .patch(`/api/users/${demoUsers['EMPLOYEE'].id}/deactivate`)
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`]);
    expect(deactRes.status).toBe(403);
    expect(deactRes.body.error.code).toBe('DEMO_RESTRICTED');

    // Finance mutations blocked
    const finInvRes = await request(app)
      .post('/api/finance/invoices')
      .set('Cookie', [`access_token=${demoTokens['FINANCE_MANAGER']}`])
      .send({
        invoiceNumber: 'INV-DEMO-BLOCK',
        clientId: demoClientId,
        subtotal: '1000',
        tax: '0',
        total: '1000',
        issueDate: '2026-11-01',
        dueDate: '2026-11-30',
      });
    expect(finInvRes.status).toBe(403);
    expect(finInvRes.body.error.code).toBe('DEMO_RESTRICTED');

    const finPayRes = await request(app)
      .post(`/api/finance/invoices/${demoInvoiceId}/payments`)
      .set('Cookie', [`access_token=${demoTokens['FINANCE_MANAGER']}`])
      .send({ amount: '100', date: '2026-11-09', method: 'BANK_TRANSFER' });
    expect(finPayRes.status).toBe(403);
    expect(finPayRes.body.error.code).toBe('DEMO_RESTRICTED');

    // Inventory mutations blocked
    const invCreateRes = await request(app)
      .post('/api/inventory/items')
      .set('Cookie', [`access_token=${demoTokens['INVENTORY_MANAGER']}`])
      .send({ kind: 'STOCK', name: 'Blocked Stock', category: 'Cables' });
    expect(invCreateRes.status).toBe(403);
    expect(invCreateRes.body.error.code).toBe('DEMO_RESTRICTED');

    // Settings update blocked
    const settingsRes = await request(app)
      .put('/api/settings')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`])
      .send({
        companyName: 'Modified Demo Company',
        currency: 'USD',
        timezone: 'UTC',
        officeStartTime: '09:00',
        lateGraceMinutes: 15,
      });
    expect(settingsRes.status).toBe(403);
    expect(settingsRes.body.error.code).toBe('DEMO_RESTRICTED');

    // Exports & bulk deletes blocked
    const exportRes = await request(app)
      .get('/api/export/users')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`]);
    expect(exportRes.status).toBe(403);
    expect(exportRes.body.error.code).toBe('DEMO_RESTRICTED');

    const deleteRes = await request(app)
      .delete(`/api/projects/${demoProjectId}`)
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`]);
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe('DEMO_RESTRICTED');
  });

  it('6. Allowed sandbox writes succeed for demo users, strip HTML/scripts, and enforce server-assigned isDemo = true', async () => {
    const createClientRes = await request(app)
      .post('/api/clients')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`])
      .send({
        name: '<b>Sandbox Demo Client</b><script>alert(1)</script>',
        email: 'sandbox.client@demo.io',
        company: 'Sandbox Co',
        isDemo: false, // Attempted payload tampering must be ignored!
      });

    expect(createClientRes.status).toBe(201);
    const createdClient = createClientRes.body.data.client;
    expect(createdClient.name).toBe('Sandbox Demo Client');
    expect(createdClient.isDemo).toBe(true);

    // Demo Employee updates task progress & posts comment
    const commentRes = await request(app)
      .post(`/api/tasks/${demoTaskId}/comments`)
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`])
      .send({ content: 'Updated in demo sandbox <script>evil()</script>clean text' });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.data.comment.content).toBe('Updated in demo sandbox clean text');
  });

  it('7. Bidirectional isolation: Demo users cannot read or link real IDs, and Real users cannot read or link demo IDs', async () => {
    // Demo PM tries to fetch real project by ID -> 404
    const demoGetRealProj = await request(app)
      .get(`/api/projects/${realProjectId}`)
      .set('Cookie', [`access_token=${demoTokens['PROJECT_MANAGER']}`]);
    expect(demoGetRealProj.status).toBe(404);

    // Demo Owner tries to create a demo project referencing realClientId -> 404
    const demoLinkRealClient = await request(app)
      .post('/api/projects')
      .set('Cookie', [`access_token=${demoTokens['OWNER']}`])
      .send({
        name: 'Cross Scope Project',
        clientId: realClientId,
        managerId: demoUsers['PROJECT_MANAGER'].id,
        startDate: '2026-01-01',
        deadline: '2026-12-31',
        budget: 50000,
      });
    expect(demoLinkRealClient.status).toBe(404);

    // Real Owner lists projects -> never sees demoProjectId
    const realListProjects = await request(app)
      .get('/api/projects')
      .set('Cookie', [`access_token=${realOwnerToken}`]);
    expect(realListProjects.status).toBe(200);
    expect(realListProjects.body.data.some((p: any) => p.id === demoProjectId)).toBe(false);

    // Real Owner tries to fetch demoProjectId directly -> 404
    const realGetDemoProj = await request(app)
      .get(`/api/projects/${demoProjectId}`)
      .set('Cookie', [`access_token=${realOwnerToken}`]);
    expect(realGetDemoProj.status).toBe(404);

    // Real PM tries to add Demo Employee to Real Project -> 404
    const realAddDemoMember = await request(app)
      .post(`/api/projects/${realProjectId}/members`)
      .set('Cookie', [`access_token=${realPmToken}`])
      .send({ userId: demoUsers['EMPLOYEE'].id, role: 'Cross Tenant' });
    expect(realAddDemoMember.status).toBe(404);

    // Real Owner tries to assign Real Asset to Demo Employee -> 404
    const realAssignDemoUser = await request(app)
      .post(`/api/inventory/items/${realItemId}/assign`)
      .set('Cookie', [`access_token=${realOwnerToken}`])
      .send({ userId: demoUsers['EMPLOYEE'].id });
    expect(realAssignDemoUser.status).toBe(404);
  });

  it('8. Enforces daily creation cap (25 creations/day) on demo sandbox writes', async () => {
    const todayKey = new Date().toISOString().split('T')[0];
    const capKey = `demo-daily-cap:${demoUsers['EMPLOYEE'].id}:${todayKey}`;

    await prisma.rateLimitBucket.upsert({
      where: { key: capKey },
      update: { count: 25, resetAt: new Date(Date.now() + 3600_000) },
      create: { key: capKey, count: 25, resetAt: new Date(Date.now() + 3600_000) },
    });

    const cappedRes = await request(app)
      .post(`/api/tasks/${demoTaskId}/comments`)
      .set('Cookie', [`access_token=${demoTokens['EMPLOYEE']}`])
      .send({ content: '26th creation attempt today' });

    expect(cappedRes.status).toBe(429);
    expect(cappedRes.body.error.code).toBe('DEMO_DAILY_CAP_REACHED');
  });

  it('9. Internal /api/internal/reset-demo cron endpoint requires valid CRON_SECRET and restores demo baseline without touching real data', async () => {
    // Unauthorized call rejected
    const unauthRes = await request(app).post('/api/internal/reset-demo');
    expect(unauthRes.status).toBe(401);

    // Authorized call with CRON_SECRET succeeds
    const cronSecret = process.env.CRON_SECRET || 'test-cron-secret-2026-secure';
    const resetRes = await request(app)
      .post('/api/internal/reset-demo')
      .set('Authorization', `Bearer ${cronSecret}`);

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Sandbox client created in test #6 should be wiped by reset
    const sandboxClient = await prisma.client.findUnique({
      where: { email: 'sandbox.client@demo.io' },
    });
    expect(sandboxClient).toBeNull();

    // Real confidential project & client must remain completely untouched
    const realProjectStillExists = await prisma.project.findUnique({
      where: { id: realProjectId },
    });
    expect(realProjectStillExists).not.toBeNull();
    expect(realProjectStillExists?.name).toBe('Confidential Real Project');
  });
});
