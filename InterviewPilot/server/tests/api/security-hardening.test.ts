import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';

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

describe('Phase 14 — Security Review & Hardening Matrix (SEC-1..8)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });

  let _userAId: string;
  let userACookie: string;
  let userBId: string;
  let _userBCookie: string;
  let blockedCookie: string;
  let blockedUserId: string;
  let _demoCookie: string;

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);

    // Register User A
    const emailA = getUniqueEmail('sec-user-a');
    const resA = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: emailA, password: 'PasswordA123!', confirmPassword: 'PasswordA123!' });
    _userAId = resA.body.data.user.id;
    userACookie = extractSessionCookie(resA.headers['set-cookie']);

    // Register User B
    const emailB = getUniqueEmail('sec-user-b');
    const resB = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: emailB, password: 'PasswordB123!', confirmPassword: 'PasswordB123!' });
    userBId = resB.body.data.user.id;
    _userBCookie = extractSessionCookie(resB.headers['set-cookie']);

    // Register Blocked User
    const emailBlocked = getUniqueEmail('sec-blocked');
    const resBlocked = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: emailBlocked, password: 'PasswordBlocked1!', confirmPassword: 'PasswordBlocked1!' });
    blockedUserId = resBlocked.body.data.user.id;
    blockedCookie = extractSessionCookie(resBlocked.headers['set-cookie']);
    // Update status to BLOCKED directly in DB
    await prisma.user.update({
      where: { id: blockedUserId },
      data: { status: 'BLOCKED' },
    });

    // Create Demo Session
    const demoRes = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', `198.51.100.${Math.floor(Math.random() * 200) + 1}`);
    _demoCookie = extractSessionCookie(demoRes.headers['set-cookie']);
  }, 60000);

  beforeEach(() => {
    resetAllRateLimits();
  });

  it('SEC-1: Unauthenticated request to protected candidate endpoints returns 401', async () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/users/me/profile' },
      { method: 'get', path: '/api/users/dashboard' },
      { method: 'get', path: '/api/documents' },
      { method: 'get', path: '/api/interviews' },
      { method: 'get', path: '/api/quota/me' },
    ];

    for (const r of protectedRoutes) {
      const res = await (request(app) as any)[r.method](r.path).set(CSRF_HEADER);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('SEC-1: Blocked user request to protected candidate endpoints returns 403 ACCOUNT_BLOCKED', async () => {
    const res = await request(app)
      .get('/api/users/me/profile')
      .set(CSRF_HEADER)
      .set('Cookie', blockedCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('SEC-1: Another user resource returns 404, never 403 (Document, Interview, Report)', async () => {
    // 1. Create a document owned by User B
    const docB = await prisma.uploadedDocument.create({
      data: {
        userId: userBId,
        originalName: 'user_b_cv.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        storageFileId: 'file_b_123',
        type: 'CV',
        status: 'READY',
      },
    });

    // User A queries User B's document -> must be 404
    const docRes = await request(app)
      .get(`/api/documents/${docB.id}`)
      .set(CSRF_HEADER)
      .set('Cookie', userACookie);
    expect(docRes.status).toBe(404);

    // 2. Create an interview owned by User B
    const invB = await prisma.interview.create({
      data: {
        userId: userBId,
        status: 'COMPLETED',
        mode: 'GENERAL',
        state: { currentDifficulty: 'MEDIUM', stage: 'COMPLETED', questionIndex: 1 },
        configuration: {
          create: {
            role: 'Product Lead',
            type: 'BEHAVIORAL',
            startDifficulty: 'MEDIUM',
            experienceLevel: 'INTERMEDIATE',
            maxQuestions: 2,
            durationMinutes: 15,
          },
        },
        report: {
          create: {
            status: 'READY',
            summary: 'User B performance summary',
            strengths: ['Communication'],
            weaknesses: ['Pacing'],
            recommendations: ['Practice STAR'],
            studyTopics: ['Executive Presence'],
          },
        },
      },
    });

    // User A queries User B's interview -> must be 404
    const invRes = await request(app)
      .get(`/api/interviews/${invB.id}`)
      .set(CSRF_HEADER)
      .set('Cookie', userACookie);
    expect(invRes.status).toBe(404);

    // User A queries User B's report -> must be 404
    const rptRes = await request(app)
      .get(`/api/interviews/${invB.id}/report`)
      .set(CSRF_HEADER)
      .set('Cookie', userACookie);
    expect(rptRes.status).toBe(404);
  });

  it('SEC-2: Input validation rejects unknown fields with 400 (strict schema check)', async () => {
    // Attempt login with rogue parameter injected
    const res = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: 'attacker@example.com',
        password: 'Password123!',
        isAdmin: true, // Unknown field
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('SEC-3: CSRF middleware rejects state-changing requests without custom header', async () => {
    // POST request without X-Requested-With header
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });

  it('SEC-6: Unhandled server errors never leak SQL queries, stack traces, or secrets', async () => {
    const res = await request(app)
      .get('/api/__test/unhandled-error')
      .set(CSRF_HEADER);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.headers['x-request-id']).toBeDefined();

    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain('SUPER_SECRET_LEAK');
    expect(responseText).not.toContain('SELECT * FROM');
    expect(responseText).not.toContain('at Error');
  });

  it('Token Revocation: Password change increments tokenVersion and revokes active sessions', async () => {
    // User A changes their password
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set(CSRF_HEADER)
      .set('Cookie', userACookie)
      .send({
        currentPassword: 'PasswordA123!',
        newPassword: 'NewPasswordA123!',
        confirmNewPassword: 'NewPasswordA123!',
      });
    expect(changeRes.status).toBe(200);

    // Old cookie with previous tokenVersion must be rejected with 401
    const oldSessionRes = await request(app)
      .get('/api/users/me/profile')
      .set(CSRF_HEADER)
      .set('Cookie', userACookie);

    expect(oldSessionRes.status).toBe(401);
    expect(oldSessionRes.body.error.code).toBe('UNAUTHENTICATED');
  });
});
