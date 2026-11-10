import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { signSessionToken } from '../../src/middleware/auth.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import {
  setUserStorageCleanupHook,
  resetUserStorageCleanupHook,
} from '../../src/services/storage/storageCleanupHook.js';

const CSRF_HEADER = { 'X-Requested-With': 'InterviewPilot' };

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const ipCookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  return ipCookie ? ipCookie.split(';')[0] : '';
}

describe('Phase 2 — Users, Profile, Onboarding, Settings (USR-1 to USR-4)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });

  beforeEach(async () => {
    resetAllRateLimits();
    resetUserStorageCleanupHook();
    await prisma.adminAuditLog.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.userProfile.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(() => {
    resetUserStorageCleanupHook();
  });

  it('USR-1: onboarding requires only fullName, saves optional fields, and skip works without fullName', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'onboard@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    expect(regRes.status).toBe(201);
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // Missing fullName rejected with 400 VALIDATION_ERROR
    const invalidRes = await request(app)
      .post('/api/users/me/onboarding')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        statusType: 'STUDENT',
      });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');

    // Only fullName required
    const minimalRes = await request(app)
      .post('/api/users/me/onboarding')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        fullName: 'Ada Lovelace',
      });
    expect(minimalRes.status).toBe(200);
    expect(minimalRes.body.data.user.profile.fullName).toBe('Ada Lovelace');
    expect(minimalRes.body.data.user.profile.onboardingCompletedAt).toBeTruthy();

    // Full optional fields saved
    const fullRes = await request(app)
      .post('/api/users/me/onboarding')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        fullName: 'Ada Lovelace Updated',
        statusType: 'PROFESSIONAL',
        experienceLevel: 'INTERMEDIATE',
        targetRole: 'Backend Engineer',
        careerGoals: 'Master distributed systems interviews',
        preferredCategories: ['TECHNICAL', 'BEHAVIORAL'],
      });
    expect(fullRes.status).toBe(200);
    expect(fullRes.body.data.user.profile).toMatchObject({
      fullName: 'Ada Lovelace Updated',
      statusType: 'PROFESSIONAL',
      experienceLevel: 'INTERMEDIATE',
      targetRole: 'Backend Engineer',
      careerGoals: 'Master distributed systems interviews',
      preferredCategories: ['TECHNICAL', 'BEHAVIORAL'],
    });

    // Skip works on a fresh user without fullName
    const regSkip = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'skip@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const skipCookie = extractSessionCookie(regSkip.headers['set-cookie']);
    const skipRes = await request(app)
      .post('/api/users/me/onboarding/skip')
      .set(CSRF_HEADER)
      .set('Cookie', skipCookie)
      .send({});
    expect(skipRes.status).toBe(200);
    expect(skipRes.body.data.user.profile.onboardingCompletedAt).toBeTruthy();
  });

  it('USR-2: /me/profile ignores id/userId in body, and user A gets 404 on user B profile', async () => {
    const regA = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'usera@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookieA = extractSessionCookie(regA.headers['set-cookie']);
    const userAId = regA.body.data.user.id as string;

    const regB = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'userb@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookieB = extractSessionCookie(regB.headers['set-cookie']);
    const userBId = regB.body.data.user.id as string;

    await request(app)
      .put('/api/users/me/profile')
      .set(CSRF_HEADER)
      .set('Cookie', cookieB)
      .send({ fullName: 'User B Original' });

    // Attempt to pass user B's id in body of /me/profile
    const updateMeRes = await request(app)
      .put('/api/users/me/profile')
      .set(CSRF_HEADER)
      .set('Cookie', cookieA)
      .send({
        id: userBId,
        userId: userBId,
        fullName: 'User A Updated',
        targetRole: 'Staff Engineer',
      });
    expect(updateMeRes.status).toBe(200);
    expect(updateMeRes.body.data.user.id).toBe(userAId);
    expect(updateMeRes.body.data.user.profile.fullName).toBe('User A Updated');

    // Verify User B was NOT modified
    const userBInDb = await prisma.user.findUnique({
      where: { id: userBId },
      include: { profile: true },
    });
    expect(userBInDb?.profile?.fullName).toBe('User B Original');

    // User A reading or updating User B's profile returns 404 NOT_FOUND (not 403)
    const getBRes = await request(app)
      .get(`/api/users/${userBId}/profile`)
      .set('Cookie', cookieA);
    expect(getBRes.status).toBe(404);
    expect(getBRes.body.error.code).toBe('NOT_FOUND');

    const putBRes = await request(app)
      .put(`/api/users/${userBId}/profile`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieA)
      .send({ fullName: 'Overwrite B' });
    expect(putBRes.status).toBe(404);
    expect(putBRes.body.error.code).toBe('NOT_FOUND');

    // User A reading own /:id/profile works
    const getARes = await request(app)
      .get(`/api/users/${userAId}/profile`)
      .set('Cookie', cookieA);
    expect(getARes.status).toBe(200);
    expect(getARes.body.data.user.id).toBe(userAId);
  });

  it('USR-3: account deletion requires password, locks account in DELETING if storage cleanup fails, and cascades user rows while keeping AdminAuditLog rows', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'delete-me@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id as string;

    // Create an admin and an AdminAuditLog row referencing this user
    const admin = await prisma.user.create({
      data: {
        email: 'admin-audit@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    const auditRow = await prisma.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: 'VIEW_USER',
        targetType: 'USER',
        targetId: userId,
        metadata: { reason: 'test audit preservation' },
      },
    });

    // Wrong password rejected with 401
    const wrongPassRes = await request(app)
      .post('/api/users/me/delete-account')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ password: 'WrongPassword999' });
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.code).toBe('UNAUTHENTICATED');

    // Simulate storage cleanup failure on first attempt
    let cleanupAttempts = 0;
    setUserStorageCleanupHook(async () => {
      cleanupAttempts += 1;
      if (cleanupAttempts === 1) {
        throw new Error('Simulated ImageKit network failure');
      }
    });

    const failedCleanupRes = await request(app)
      .post('/api/users/me/delete-account')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ password: 'Password123' });
    expect(failedCleanupRes.status).toBe(502);

    // User is now in DELETING status
    const deletingUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(deletingUser?.status).toBe('DELETING');

    // Login is blocked while DELETING
    const loginWhileDeleting = await request(app)
      .post('/api/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: 'delete-me@example.com',
        password: 'Password123',
      });
    expect(loginWhileDeleting.status).toBe(403);
    expect(loginWhileDeleting.body.error.code).toBe('ACCOUNT_BLOCKED');

    // Normal profile read is blocked while DELETING
    const profileWhileDeleting = await request(app)
      .get('/api/users/me/profile')
      .set('Cookie', cookie);
    expect(profileWhileDeleting.status).toBe(403);
    expect(profileWhileDeleting.body.error.code).toBe('ACCOUNT_BLOCKED');

    // Retry deletion (cleanup succeeds on attempt 2)
    const retryDeleteRes = await request(app)
      .post('/api/users/me/delete-account')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ password: 'Password123' });
    expect(retryDeleteRes.status).toBe(200);
    expect(retryDeleteRes.body.data.deleted).toBe(true);

    // User and UserProfile are hard-deleted
    const deletedUser = await prisma.user.findUnique({ where: { id: userId } });
    const deletedProfile = await prisma.userProfile.findUnique({ where: { userId } });
    expect(deletedUser).toBeNull();
    expect(deletedProfile).toBeNull();

    // AdminAuditLog row remains intact with targetId
    const preservedAudit = await prisma.adminAuditLog.findUnique({
      where: { id: auditRow.id },
    });
    expect(preservedAudit).not.toBeNull();
    expect(preservedAudit?.targetId).toBe(userId);
  });

  it('USR-4 & wrong-role matrix: privacy controls list only the 3 MVP controls; anonymous, demo, and blocked users are rejected appropriately', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'privacy@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const userCookie = extractSessionCookie(regRes.headers['set-cookie']);

    const controlsRes = await request(app)
      .get('/api/users/me/privacy-controls')
      .set('Cookie', userCookie);
    expect(controlsRes.status).toBe(200);
    expect(controlsRes.body.data.controls).toEqual([
      'DELETE_INTERVIEW',
      'DELETE_DOCUMENT',
      'DELETE_ACCOUNT',
    ]);

    // Anonymous -> 401
    const anonRes = await request(app)
      .put('/api/users/me/profile')
      .set(CSRF_HEADER)
      .send({
        fullName: 'Anon',
      });
    expect(anonRes.status).toBe(401);

    // Demo visitor -> 403 DEMO_RESTRICTED on profile update and account deletion
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo-visitor@example.com',
        role: 'USER',
        status: 'ACTIVE',
        isDemo: true,
      },
    });
    const demoToken = signSessionToken({ userId: demoUser.id, tokenVersion: 0 });
    const demoCookie = `${AUTH_COOKIE_NAME}=${demoToken}`;

    const demoUpdateRes = await request(app)
      .put('/api/users/me/profile')
      .set(CSRF_HEADER)
      .set('Cookie', demoCookie)
      .send({ fullName: 'Demo Edit' });
    expect(demoUpdateRes.status).toBe(403);
    expect(demoUpdateRes.body.error.code).toBe('DEMO_RESTRICTED');

    const demoDeleteRes = await request(app)
      .post('/api/users/me/delete-account')
      .set(CSRF_HEADER)
      .set('Cookie', demoCookie)
      .send({ password: 'Password123' });
    expect(demoDeleteRes.status).toBe(403);
    expect(demoDeleteRes.body.error.code).toBe('DEMO_RESTRICTED');

    // Blocked user -> 403 ACCOUNT_BLOCKED
    const blockedUser = await prisma.user.create({
      data: {
        email: 'blocked-user@example.com',
        role: 'USER',
        status: 'BLOCKED',
      },
    });
    const blockedToken = signSessionToken({ userId: blockedUser.id, tokenVersion: 0 });
    const blockedCookie = `${AUTH_COOKIE_NAME}=${blockedToken}`;

    const blockedRes = await request(app)
      .get('/api/users/me/profile')
      .set('Cookie', blockedCookie);
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe('ACCOUNT_BLOCKED');
  });
});
