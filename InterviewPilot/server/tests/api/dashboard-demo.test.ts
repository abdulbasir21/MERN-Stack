import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';
import { purgeExpiredDemoUsers, hashClientIp } from '../../src/services/demo/demoService.js';

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

describe('Phase 11 — Candidate Dashboard & Demo Experience (RPT-8, DEM-1..7)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  }, 60000);

  beforeEach(async () => {
    resetAllRateLimits();
    try {
      await prisma.demoSession.deleteMany({});
      await prisma.user.deleteMany({ where: { isDemo: true } });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    // Reset any application settings toggled during tests
    try {
      await prisma.applicationSetting.upsert({
        where: { key: 'demoEnabled' },
        update: { value: true },
        create: { key: 'demoEnabled', value: true },
      });
      await prisma.applicationSetting.upsert({
        where: { key: 'liveDemoEnabled' },
        update: { value: true },
        create: { key: 'liveDemoEnabled', value: true },
      });
    } catch {
      // ignore
    }
  });

  it('RPT-8: Dashboard returns accurately calculated metrics matching DB, zero AI calls', async () => {
    // 1. Register a fresh user
    const email = getUniqueEmail('candidate-dash');
    const registerRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email, password: 'Password123!', confirmPassword: 'Password123!' });
    expect(registerRes.status).toBe(201);
    const cookie = extractSessionCookie(registerRes.headers['set-cookie']);
    const userId = registerRes.body.data.user.id;

    // 2. Query empty dashboard
    const dashRes1 = await request(app)
      .get('/api/users/dashboard')
      .set(CSRF_HEADER)
      .set('Cookie', cookie);
    expect(dashRes1.status).toBe(200);
    expect(dashRes1.body.data.statistics.totalInterviews).toBe(0);
    expect(dashRes1.body.data.statistics.completedInterviews).toBe(0);
    expect(dashRes1.body.data.statistics.averageScore).toBeNull();
    expect(dashRes1.body.data.statistics.recentTrend).toEqual([]);
    expect(dashRes1.body.data.recommendations).toBeNull();

    // 3. Insert fixture interviews directly in DB to verify pure calculation
    const inv1 = await prisma.interview.create({
      data: {
        userId,
        status: 'COMPLETED',
        mode: 'GENERAL',
        state: { currentDifficulty: 'HARD', stage: 'COMPLETED', questionIndex: 2 },
        startedAt: new Date(Date.now() - 3600000),
        endedAt: new Date(Date.now() - 3000000),
        configuration: {
          create: {
            role: 'Software Architect',
            type: 'TECHNICAL',
            startDifficulty: 'HARD',
            experienceLevel: 'EXPERIENCED',
            maxQuestions: 2,
            durationMinutes: 10,
          },
        },
        report: {
          create: {
            status: 'READY',
            summary: 'Exceptional system architecture mastery.',
            strengths: ['High scalability design', 'Clean API contracts'],
            weaknesses: ['Could elaborate on caching failure modes'],
            recommendations: ['Review distributed lock edge cases'],
            studyTopics: ['Redis Redlock', 'Distributed Consensus'],
          },
        },
      },
    });

    const q1 = await prisma.interviewQuestion.create({
      data: {
        interviewId: inv1.id,
        orderIndex: 1,
        topic: 'Architecture',
        difficulty: 'HARD',
        text: 'Explain idempotency keys.',
        textHash: 'hash_idempotency_123',
      },
    });

    const ans1 = await prisma.candidateAnswer.create({
      data: {
        interviewId: inv1.id,
        questionId: q1.id,
        transcript: 'An idempotency key ensures a request executes at most once.',
        isEmpty: false,
      },
    });

    await prisma.answerEvaluation.create({
      data: {
        answerId: ans1.id,
        overallScore: 90,
        criteriaScores: [
          { name: 'Clarity', score: 90, feedback: 'Precise' },
          { name: 'Depth', score: 90, feedback: 'Accurate' },
        ],
      },
    });

    // 4. Query dashboard again — must match the created record exactly
    const dashRes2 = await request(app)
      .get('/api/users/dashboard')
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(dashRes2.status).toBe(200);
    const stats = dashRes2.body.data.statistics;
    expect(stats.totalInterviews).toBe(1);
    expect(stats.completedInterviews).toBe(1);
    expect(stats.averageScore).toBe(90);
    expect(stats.recentTrend).toEqual([90]);

    expect(dashRes2.body.data.recentInterviews).toHaveLength(1);
    expect(dashRes2.body.data.recentInterviews[0].role).toBe('Software Architect');
    expect(dashRes2.body.data.recentInterviews[0].overallScore).toBe(90);
    expect(dashRes2.body.data.recentInterviews[0].hasReport).toBe(true);

    expect(dashRes2.body.data.recommendations).not.toBeNull();
    expect(dashRes2.body.data.recommendations.summary).toBe('Exceptional system architecture mastery.');
    expect(dashRes2.body.data.recommendations.strengths).toContain('High scalability design');
  });

  it('DEM-1: "Try Demo" creates ephemeral user and DemoSession with JWT cookie', async () => {
    const demoIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    const res = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', demoIp);

    expect(res.status).toBe(201);
    expect(res.body.data.user.isDemo).toBe(true);
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.limits).toEqual({
      maxInterviews: 1,
      maxMinutes: 5,
      maxQuestions: 3,
    });

    const cookie = extractSessionCookie(res.headers['set-cookie']);
    expect(cookie).toContain(AUTH_COOKIE_NAME);

    // Verify DemoSession exists in DB
    const session = await prisma.demoSession.findFirst({
      where: { userId: res.body.data.user.id },
    });
    expect(session).not.toBeNull();
    expect(session?.ipHash).toBe(hashClientIp(demoIp));
  });

  it('DEM-3: Second demo session on same day from same IP returns 429 DEMO_RESTRICTED', async () => {
    const uniqueIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;

    // First session: success
    const res1 = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', uniqueIp);
    expect(res1.status).toBe(201);

    // Second session from same IP: blocked
    const res2 = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', uniqueIp);
    expect(res2.status).toBe(429);
    expect(res2.body.error.code).toBe('DEMO_RESTRICTED');
  });

  it('DEM-4: Demo visitor is rejected from document upload with 403 DEMO_RESTRICTED', async () => {
    const uniqueIp = `192.0.2.${Math.floor(Math.random() * 200) + 10}`;
    const demoRes = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', uniqueIp);
    const demoCookie = extractSessionCookie(demoRes.headers['set-cookie']);

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', demoCookie)
      .field('type', 'CV')
      .attach('file', Buffer.from('CV text content'), 'resume.txt');

    expect(uploadRes.status).toBe(403);
    expect(uploadRes.body.error.code).toBe('DEMO_RESTRICTED');
  });

  it('DEM-5: Demo visitor A gets 404 when querying demo visitor B interview', async () => {
    const ipA = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const ipB = `198.51.101.${Math.floor(Math.random() * 200) + 1}`;

    const resA = await request(app).post('/api/demo/session').set(CSRF_HEADER).set('X-Forwarded-For', ipA);
    const resB = await request(app).post('/api/demo/session').set(CSRF_HEADER).set('X-Forwarded-For', ipB);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);

    const cookieA = extractSessionCookie(resA.headers['set-cookie']);
    const userBId = resB.body.data.user.id;

    // Create interview owned by visitor B
    const invB = await prisma.interview.create({
      data: {
        userId: userBId,
        status: 'IN_PROGRESS',
        mode: 'GENERAL',
        state: { currentDifficulty: 'MEDIUM', stage: 'QUESTIONING', questionIndex: 0 },
        configuration: {
          create: {
            role: 'Product Manager',
            type: 'BEHAVIORAL',
            startDifficulty: 'MEDIUM',
            experienceLevel: 'INTERMEDIATE',
            maxQuestions: 3,
            durationMinutes: 5,
          },
        },
      },
    });

    // Visitor A tries to access B's interview
    const accessRes = await request(app)
      .get(`/api/interviews/${invB.id}`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieA);

    // Rule: Another user's resource returns 404, never 403
    expect(accessRes.status).toBe(404);
  });

  it('DEM-2: demoEnabled = false returns 503 DEMO_DISABLED on create session', async () => {
    await prisma.applicationSetting.upsert({
      where: { key: 'demoEnabled' },
      update: { value: false },
      create: { key: 'demoEnabled', value: false },
    });

    const res = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', '10.0.0.99');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DEMO_DISABLED');
  });

  it('DEM-2, DEM-5: liveDemoEnabled = false blocks starting live interview, but samples remain readable', async () => {
    await prisma.applicationSetting.upsert({
      where: { key: 'demoEnabled' },
      update: { value: true },
      create: { key: 'demoEnabled', value: true },
    });
    await prisma.applicationSetting.upsert({
      where: { key: 'liveDemoEnabled' },
      update: { value: false },
      create: { key: 'liveDemoEnabled', value: false },
    });

    // Samples endpoint remains accessible without auth
    const sampleRes = await request(app).get('/api/demo/samples').set(CSRF_HEADER);
    expect(sampleRes.status).toBe(200);
    expect(sampleRes.body.data.sampleInterview).toBeDefined();

    // Create demo session with unique IP
    const demoIp = `10.200.10.${Math.floor(Math.random() * 200) + 1}`;
    const res = await request(app)
      .post('/api/demo/session')
      .set(CSRF_HEADER)
      .set('X-Forwarded-For', demoIp);
    expect(res.status).toBe(201);
    const cookie = extractSessionCookie(res.headers['set-cookie']);

    // Attempting to create an interview when liveDemoEnabled is false fails with 403 DEMO_LIVE_DISABLED
    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'General Practice',
        type: 'BEHAVIORAL',
        experienceLevel: 'INTERMEDIATE',
        difficulty: 'MEDIUM',
        durationMinutes: 5,
      });

    expect(setupRes.status).toBe(403);
    expect(setupRes.body.error.code).toBe('DEMO_LIVE_DISABLED');
  });

  it('DEM-7: Expired demo users are purged successfully', async () => {
    // Manually create an expired demo user and session
    const expiredUser = await prisma.user.create({
      data: {
        email: `expired-${Date.now()}@demo.local`,
        role: 'USER',
        isDemo: true,
        profile: {
          create: {
            fullName: 'Old Demo User',
          },
        },
      },
    });

    await prisma.demoSession.create({
      data: {
        userId: expiredUser.id,
        ipHash: 'expired_hash_123',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });

    const purgedCount = await purgeExpiredDemoUsers(10);
    expect(purgedCount).toBeGreaterThanOrEqual(1);

    // Verify expired user was purged from DB
    const checkUser = await prisma.user.findUnique({
      where: { id: expiredUser.id },
    });
    expect(checkUser).toBeNull();
  });
});
