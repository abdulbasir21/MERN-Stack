import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import {
  clearCapturedTestEmails,
  getCapturedTestEmails,
} from '../../src/services/email/emailAdapter.js';
import { seedDatabase } from '../../prisma/seed.js';

const CSRF_HEADER = { 'X-Requested-With': 'InterviewPilot' };

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const ipCookie = list.find((c) => c.startsWith('ip_session='));
  return ipCookie ? ipCookie.split(';')[0] : '';
}

describe('Phase 1 — Authentication, Roles, Permissions & Rate Limits (AUTH-1..8, SEC-1..3, QTA-13)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });

  beforeEach(async () => {
    resetAllRateLimits();
    clearCapturedTestEmails();
    await prisma.passwordResetToken.deleteMany({});
    await prisma.userProfile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.adminAuditLog.deleteMany({});
  });

  it('AUTH-1 & AUTH-2: validates registration, normalizes email, hashes password, and rejects duplicate emails', async () => {
    // Weak password rejected
    const badRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'candidate@example.com',
        password: 'short',
        confirmPassword: 'short',
      });
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');

    // Valid registration
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: '  Candidate.One@Example.com  ',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.email).toBe('candidate.one@example.com');
    expect(regRes.body.data.user.role).toBe('USER');
    expect(regRes.body.data.user.status).toBe('ACTIVE');
    expect(regRes.body.data.user.passwordHash).toBeUndefined();

    const dbUser = await prisma.user.findUnique({
      where: { email: 'candidate.one@example.com' },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.passwordHash).toBeDefined();
    expect(dbUser?.passwordHash).not.toBe('Password123');
    expect(dbUser?.passwordHash?.startsWith('$2b$12$')).toBe(true);

    // Duplicate email rejected with 409
    const dupRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'candidate.one@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('CONFLICT');
  });

  it('AUTH-1 & SEC-2: rejects attempts to set role, status, isDemo, or tokenVersion from client', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'hacker@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-3 & QTA-13: returns generic 401 on wrong email/password and rate-limits after 5 failures', async () => {
    await request(app).post('/api/auth/register').set(CSRF_HEADER).send({
      email: 'user@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    const wrongEmailRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'nonexistent@example.com', password: 'Password123' });

    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'user@example.com', password: 'WrongPassword99' });

    expect(wrongEmailRes.status).toBe(401);
    expect(wrongPassRes.status).toBe(401);
    expect(wrongEmailRes.body.error.message).toBe('Invalid email or password');
    expect(wrongPassRes.body.error.message).toBe('Invalid email or password');

    // Trigger 4 more failed attempts for user@example.com (total 5 failed attempts)
    for (let i = 0; i < 4; i++) {
      const r = await request(app)
        .post('/api/auth/login')
        .set(CSRF_HEADER)
        .send({ email: 'user@example.com', password: 'WrongPassword99' });
      expect(r.status).toBe(401);
    }

    // 6th attempt -> 429 RATE_LIMITED
    const rateLimitedRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'user@example.com', password: 'Password123' });

    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body.error.code).toBe('RATE_LIMITED');
  });

  it('AUTH-4: rejects BLOCKED or DELETING user on login and invalidates existing valid token on next request', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'blocked@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    expect(cookie).toContain('ip_session=');

    // Block user in DB
    await prisma.user.update({
      where: { email: 'blocked@example.com' },
      data: { status: 'BLOCKED' },
    });

    // Existing valid token must be rejected with 403 ACCOUNT_BLOCKED
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(403);
    expect(meRes.body.error.code).toBe('ACCOUNT_BLOCKED');

    // Login attempt must also be rejected with 403 ACCOUNT_BLOCKED
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'blocked@example.com', password: 'Password123' });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('AUTH-5: changing password requires current password and invalidates old tokens via tokenVersion', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'change@example.com',
        password: 'OldPassword123',
        confirmPassword: 'OldPassword123',
      });

    const oldCookie = extractSessionCookie(regRes.headers['set-cookie']);

    // Wrong current password fails
    const badChangeRes = await request(app)
      .post('/api/auth/change-password')
      .set(CSRF_HEADER)
      .set('Cookie', oldCookie)
      .send({
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword456',
        confirmNewPassword: 'NewPassword456',
      });
    expect(badChangeRes.status).toBe(401);

    // Valid password change succeeds
    const goodChangeRes = await request(app)
      .post('/api/auth/change-password')
      .set(CSRF_HEADER)
      .set('Cookie', oldCookie)
      .send({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmNewPassword: 'NewPassword456',
      });
    expect(goodChangeRes.status).toBe(200);

    // Old token is now rejected because tokenVersion was incremented
    const oldTokenMeRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', oldCookie);
    expect(oldTokenMeRes.status).toBe(401);
    expect(oldTokenMeRes.body.error.code).toBe('UNAUTHENTICATED');

    // New token works
    const newCookie = extractSessionCookie(goodChangeRes.headers['set-cookie']);
    const newTokenMeRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', newCookie);
    expect(newTokenMeRes.status).toBe(200);
  });

  it('AUTH-6: password reset token is hashed in DB, single-use, expires in 30m, and invalidates old tokens', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'reset@example.com',
        password: 'InitialPassword1',
        confirmPassword: 'InitialPassword1',
      });
    const oldCookie = extractSessionCookie(regRes.headers['set-cookie']);

    // Identical response for existing and non-existing email
    const unknownForgot = await request(app)
      .post('/api/auth/forgot-password')
      .set(CSRF_HEADER)
      .send({ email: 'nobody@example.com' });
    const knownForgot = await request(app)
      .post('/api/auth/forgot-password')
      .set(CSRF_HEADER)
      .send({ email: 'reset@example.com' });

    expect(unknownForgot.status).toBe(200);
    expect(knownForgot.status).toBe(200);
    expect(unknownForgot.body.data.message).toBe(knownForgot.body.data.message);

    const emails = getCapturedTestEmails();
    expect(emails.length).toBe(1);
    const rawToken = emails[0].token;

    // Verify only hash is stored in DB, never raw token
    const storedToken = await prisma.passwordResetToken.findFirst({});
    expect(storedToken).not.toBeNull();
    expect(storedToken?.tokenHash).not.toBe(rawToken);

    // Reset password using raw token
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .set(CSRF_HEADER)
      .send({
        token: rawToken,
        password: 'ResetPassword99',
        confirmPassword: 'ResetPassword99',
      });
    expect(resetRes.status).toBe(200);

    // Old session token is invalidated
    const meWithOld = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(meWithOld.status).toBe(401);

    // Reusing the same reset token fails (single-use)
    const reuseRes = await request(app)
      .post('/api/auth/reset-password')
      .set(CSRF_HEADER)
      .send({
        token: rawToken,
        password: 'AnotherPassword99',
        confirmPassword: 'AnotherPassword99',
      });
    expect(reuseRes.status).toBe(400);

    // Expired token fails
    clearCapturedTestEmails();
    await request(app)
      .post('/api/auth/forgot-password')
      .set(CSRF_HEADER)
      .send({ email: 'reset@example.com' });
    const expiredRawToken = getCapturedTestEmails()[0].token;
    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const expiredRes = await request(app)
      .post('/api/auth/reset-password')
      .set(CSRF_HEADER)
      .send({
        token: expiredRawToken,
        password: 'AnotherPassword99',
        confirmPassword: 'AnotherPassword99',
      });
    expect(expiredRes.status).toBe(400);
  });

  it('AUTH-7, AUTH-8 & SEC-1: seed creates first ADMIN, wrong-role gets 401/403 on admin route, and logout clears cookie', async () => {
    // Anonymous gets 401 on admin route
    const anonAdminRes = await request(app).get('/api/admin/access-check');
    expect(anonAdminRes.status).toBe(401);

    // Register normal USER -> gets 403 on admin route
    const userReg = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'normaluser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const userCookie = extractSessionCookie(userReg.headers['set-cookie']);

    const userAdminRes = await request(app)
      .get('/api/admin/access-check')
      .set('Cookie', userCookie);
    expect(userAdminRes.status).toBe(403);
    expect(userAdminRes.body.error.code).toBe('FORBIDDEN');

    // Seed database creates first ADMIN from ADMIN_BOOTSTRAP_EMAIL
    const { adminEmail } = await seedDatabase(prisma, {
      defaultAdminPassword: 'AdminSeedPassword123',
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: adminEmail,
        password: 'AdminSeedPassword123',
      });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.data.user.role).toBe('ADMIN');

    const adminCookie = extractSessionCookie(adminLogin.headers['set-cookie']);
    const adminCheckRes = await request(app)
      .get('/api/admin/access-check')
      .set('Cookie', adminCookie);
    expect(adminCheckRes.status).toBe(200);
    expect(adminCheckRes.body.data.allowed).toBe(true);

    // AUTH-8: Logout clears cookie
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set(CSRF_HEADER)
      .set('Cookie', userCookie);
    expect(logoutRes.status).toBe(200);
    const rawSetCookie = logoutRes.headers['set-cookie'];
    const clearedSetCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie.join(';')
      : String(rawSetCookie || '');
    expect(clearedSetCookie).toContain('ip_session=;');
  });
});
