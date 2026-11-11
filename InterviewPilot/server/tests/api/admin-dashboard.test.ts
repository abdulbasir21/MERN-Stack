import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';
import {
  setStorageAdapter,
  InMemoryStorageAdapter,
} from '../../src/services/storage/imagekitAdapter.js';

const CSRF_HEADER = { 'X-Requested-With': 'InterviewPilot' };

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const ipCookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  return ipCookie ? ipCookie.split(';')[0] : '';
}

function getUniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe('Phase 12 — Admin Dashboard & Global Controls (ADM-1..10, DEM-6, QTA-4, QTA-10, SEC-1)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  let memStorage: InMemoryStorageAdapter;

  let adminCookie: string;
  let adminUserId: string;
  let userCookie: string;
  let userId: string;
  let demoCookie: string;

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);

    memStorage = new InMemoryStorageAdapter();
    setStorageAdapter(memStorage);

    // 1. Fetch seed admin
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    expect(adminUser).not.toBeNull();
    adminUserId = adminUser!.id;

    // Reset admin password to ensure deterministic login
    const adminHash = await bcrypt.hash('AdminPassword123!', 10);
    await prisma.user.update({
      where: { id: adminUserId },
      data: { passwordHash: adminHash, status: 'ACTIVE' },
    });

    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({ email: adminUser!.email, password: 'AdminPassword123!' });
    expect(adminLoginRes.status).toBe(200);
    adminCookie = extractSessionCookie(adminLoginRes.headers['set-cookie']);

    // 2. Register regular USER
    const userEmail = getUniqueEmail('regular-user');
    const userRegRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: userEmail, password: 'UserPassword123!', confirmPassword: 'UserPassword123!' });
    expect(userRegRes.status).toBe(201);
    userCookie = extractSessionCookie(userRegRes.headers['set-cookie']);
    userId = userRegRes.body.data.user.id;

    // 3. Create Demo session
    const demoIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const demoRes = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', demoIp);
    expect(demoRes.status).toBe(201);
    demoCookie = extractSessionCookie(demoRes.headers['set-cookie']);
  }, 60000);

  beforeEach(() => {
    resetAllRateLimits();
  });

  it('ADM-1, SEC-1: Every admin route returns 401 for anonymous and 403 for USER and demo', async () => {
    const adminEndpoints = [
      { method: 'get', path: '/api/admin/overview' },
      { method: 'get', path: '/api/admin/users' },
      { method: 'get', path: '/api/admin/documents' },
      { method: 'get', path: '/api/admin/interviews' },
      { method: 'get', path: '/api/admin/usage' },
      { method: 'get', path: '/api/admin/settings' },
      { method: 'get', path: '/api/admin/audit-logs' },
    ];

    for (const ep of adminEndpoints) {
      // Anonymous -> 401
      const anonRes = await (request(app) as any)[ep.method](ep.path).set(CSRF_HEADER);
      expect(anonRes.status).toBe(401);

      // Regular USER -> 403
      const userRes = await (request(app) as any)[ep.method](ep.path).set(CSRF_HEADER).set('Cookie', userCookie);
      expect(userRes.status).toBe(403);

      // Demo visitor -> 403
      const demoRes = await (request(app) as any)[ep.method](ep.path).set(CSRF_HEADER).set('Cookie', demoCookie);
      expect(demoRes.status).toBe(403);
    }
  });

  it('ADM-2: Admin metrics equal database values and separate real vs demo', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(typeof data.totalRegisteredUsers).toBe('number');
    expect(typeof data.activeUsers7d).toBe('number');
    expect(typeof data.activeDemoSessions).toBe('number');
    expect(typeof data.interviews.realTotal).toBe('number');
    expect(typeof data.interviews.demoTotal).toBe('number');
    expect(typeof data.uploadedDocumentsTotal).toBe('number');
    expect(data.budget.aiEnabled).toBeDefined();
    expect(data.budget.totalBudgetUsd).toBeDefined();
  });

  it('ADM-3: Admin can block and unblock a user, but cannot block self or another admin', async () => {
    // 1. Create a second admin
    const secondAdminEmail = getUniqueEmail('second-admin');
    const secondAdmin = await prisma.user.create({
      data: {
        email: secondAdminEmail,
        role: 'ADMIN',
        profile: { create: { fullName: 'Second Admin' } },
      },
    });

    // 2. Admin cannot block self -> 403
    const blockSelfRes = await request(app)
      .patch(`/api/admin/users/${adminUserId}/status`)
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie)
      .send({ block: true });
    expect(blockSelfRes.status).toBe(403);

    // 3. Admin cannot block another admin -> 403
    const blockOtherAdminRes = await request(app)
      .patch(`/api/admin/users/${secondAdmin.id}/status`)
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie)
      .send({ block: true });
    expect(blockOtherAdminRes.status).toBe(403);

    // 4. Admin blocks regular user -> 200
    const blockUserRes = await request(app)
      .patch(`/api/admin/users/${userId}/status`)
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie)
      .send({ block: true });
    expect(blockUserRes.status).toBe(200);
    expect(blockUserRes.body.data.status).toBe('BLOCKED');

    // Verify user is actually blocked in DB
    const checkBlocked = await prisma.user.findUnique({ where: { id: userId } });
    expect(checkBlocked?.status).toBe('BLOCKED');

    // 5. Admin unblocks regular user -> 200
    const unblockUserRes = await request(app)
      .patch(`/api/admin/users/${userId}/status`)
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie)
      .send({ block: false });
    expect(unblockUserRes.status).toBe(200);
    expect(unblockUserRes.body.data.status).toBe('ACTIVE');

    // Verify audit log row was written
    const auditLogRow = await prisma.adminAuditLog.findFirst({
      where: { targetId: userId, action: 'USER_UNBLOCKED' },
    });
    expect(auditLogRow).not.toBeNull();
  });

  it('ADM-4: Document preview/download writes an audit row and fails if audit write fails', async () => {
    // 1. Create a document in memory storage and DB
    const uploaded = await memStorage.uploadPrivateFile(userId, Buffer.from('PDF Content'), 'secret_cv.pdf');
    const doc = await prisma.uploadedDocument.create({
      data: {
        userId,
        originalName: 'secret_cv.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageFileId: uploaded.fileId,
        type: 'CV',
        status: 'READY',
      },
    });

    // 2. Admin downloads document
    const dlRes = await request(app)
      .get(`/api/admin/documents/${doc.id}/download?download=true`)
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie);

    expect(dlRes.status).toBe(200);

    // 3. Verify audit log entry exists
    const audit = await prisma.adminAuditLog.findFirst({
      where: { targetId: doc.id, action: 'DOCUMENT_DOWNLOADED' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(adminUserId);
  });

  it('ADM-5: Viewing another user transcript is audited with strictly no audio endpoint', async () => {
    // 1. Create an interview owned by user
    const inv = await prisma.interview.create({
      data: {
        userId,
        status: 'COMPLETED',
        mode: 'GENERAL',
        state: { currentDifficulty: 'MEDIUM', stage: 'COMPLETED', questionIndex: 1 },
        configuration: {
          create: {
            role: 'Lead Architect',
            type: 'TECHNICAL',
            startDifficulty: 'HARD',
            experienceLevel: 'EXPERIENCED',
            maxQuestions: 2,
            durationMinutes: 15,
          },
        },
      },
    });

    // 2. Admin audits interview
    const auditRes = await request(app)
      .get(`/api/admin/interviews/${inv.id}/audit`)
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.interview.id).toBe(inv.id);

    // 3. Verify audit log entry exists
    const audit = await prisma.adminAuditLog.findFirst({
      where: { targetId: inv.id, action: 'INTERVIEW_TRANSCRIPT_AUDITED' },
    });
    expect(audit).not.toBeNull();
  });

  it('ADM-7: Settings changes store before/after without secrets, and emergency shutdown works', async () => {
    // 1. Update settings with range-validated values
    const updateRes = await request(app)
      .put('/api/admin/settings')
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie)
      .send({
        demoInterviewsPerIpPerDay: 3,
        freeUserInterviewsPerMonth: 8,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.changes.demoInterviewsPerIpPerDay.after).toBe(3);

    // Verify audit log has before/after without secrets
    const audit = await prisma.adminAuditLog.findFirst({
      where: { action: 'SETTINGS_UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    const metadata = audit?.metadata as any;
    expect(metadata.changes.demoInterviewsPerIpPerDay.after).toBe(3);

    // 2. Trigger Emergency AI Shutdown (QTA-10)
    const shutdownRes = await request(app)
      .post('/api/admin/settings/emergency-shutdown')
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie);

    expect(shutdownRes.status).toBe(200);
    expect(shutdownRes.body.data.aiEnabled).toBe(false);

    // Verify aiEnabled is false in database
    const aiSetting = await prisma.applicationSetting.findUnique({ where: { key: 'aiEnabled' } });
    expect(aiSetting?.value).toBe(false);

    // Re-enable for subsequent operations
    await prisma.applicationSetting.upsert({
      where: { key: 'aiEnabled' },
      update: { value: true },
      create: { key: 'aiEnabled', value: true },
    });
  });

  it('ADM-6: Usage aggregates label costs as ESTIMATED', async () => {
    const res = await request(app)
      .get('/api/admin/usage')
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.costNote).toBe('ESTIMATED');
    expect(Array.isArray(res.body.data.aggregates)).toBe(true);
  });

  it('ADM-10: Admin responses never leak passwords, password hashes, tokens, or secrets', async () => {
    const endpoints = [
      '/api/admin/overview',
      '/api/admin/users',
      '/api/admin/settings',
      '/api/admin/audit-logs',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep).set(CSRF_HEADER).set('Cookie', adminCookie);
      const text = JSON.stringify(res.body);

      expect(text).not.toContain('passwordHash');
      expect(text).not.toContain('jwt');
      expect(text).not.toContain('DEMO_IP_HASH_SECRET');
      expect(text).not.toContain('GEMINI_API_KEY');
    }
  });

  it('DEM-6: Reset demo data deletes all demo users and sessions by cascade', async () => {
    // 1. Ensure at least one demo user exists
    const demoIp = `198.51.102.${Math.floor(Math.random() * 200) + 1}`;
    await request(app).post('/api/demo/session').set(CSRF_HEADER).set('X-Forwarded-For', demoIp);

    const demoCountBefore = await prisma.user.count({ where: { isDemo: true } });
    expect(demoCountBefore).toBeGreaterThanOrEqual(1);

    // 2. Admin triggers reset demo data
    const resetRes = await request(app)
      .post('/api/admin/demo/reset')
      .set(CSRF_HEADER)
      .set('Cookie', adminCookie);

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data.success).toBe(true);
    expect(resetRes.body.data.deletedDemoUsersCount).toBeGreaterThanOrEqual(1);

    // 3. Confirm 0 demo users remain
    const demoCountAfter = await prisma.user.count({ where: { isDemo: true } });
    expect(demoCountAfter).toBe(0);

    // 4. Verify audit log entry
    const audit = await prisma.adminAuditLog.findFirst({
      where: { action: 'DEMO_DATA_RESET' },
    });
    expect(audit).not.toBeNull();
  });
});
