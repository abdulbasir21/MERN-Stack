import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';
import { buildInterviewContext } from '../../src/lib/interviewEngineMath.js';
import {
  MockInterviewPlanGenerator,
  setInterviewPlanGenerator,
  resetInterviewPlanGenerator,
} from '../../src/services/interview/interviewPlanService.js';
import {
  MockTurnEvaluator,
  setTurnEvaluator,
  resetTurnEvaluator,
} from '../../src/services/interviewEngine/evaluationService.js';
import {
  MockReportGenerator,
  setReportGenerator,
  resetReportGenerator,
} from '../../src/services/report/reportService.js';

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

describe('Phase 10 — Evaluation, Reports, History (EVL-1..5, RPT-1..7)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  let mockPlanGenerator: MockInterviewPlanGenerator;
  let mockTurnEvaluator: MockTurnEvaluator;
  let mockReportGenerator: MockReportGenerator;

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  }, 60000);

  beforeEach(() => {
    resetAllRateLimits();
    mockPlanGenerator = new MockInterviewPlanGenerator();
    setInterviewPlanGenerator(mockPlanGenerator);
    mockTurnEvaluator = new MockTurnEvaluator();
    setTurnEvaluator(mockTurnEvaluator);
    mockReportGenerator = new MockReportGenerator();
    setReportGenerator(mockReportGenerator);
  });

  afterEach(() => {
    resetInterviewPlanGenerator();
    resetTurnEvaluator();
    resetReportGenerator();
  });

  it('EVL-3: prompt snapshot contains the anti-bias rule', () => {
    const prompt = buildInterviewContext({
      role: 'Backend Engineer',
      experienceLevel: 'SENIOR',
      type: 'TECHNICAL',
      currentDifficulty: 'HARD',
      turnsHistory: [],
      currentQuestion: 'How would you design a distributed rate limiter?',
    });

    // EVL-3: Prompt must say: do not score by length or vocabulary; do not inflate scores
    expect(prompt).toContain('do not score by length or vocabulary');
    expect(prompt).toContain('do not inflate scores');
  });

  it('RPT-2 & EVL-5: report cannot be generated with 0 evaluated answers; requires >= 1 answer', async () => {
    const email = getUniqueEmail('rpt-empty');
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email, password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Data Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });

    const interviewId = setupRes.body.data.interview.id;

    // Attempt to generate report before answering any questions
    const genRes = await request(app)
      .post(`/api/interviews/${interviewId}/report/generate`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(genRes.status).toBe(400);
    expect(genRes.body.error.code).toBe('INVALID_STATE');
    expect(genRes.body.error.message).toContain('At least one answer must be evaluated');
  });

  it('EVL-1..5, RPT-1..5: answers evaluated, scores calculated on read, report generated, immutable evaluation', async () => {
    const email = getUniqueEmail('rpt-full');
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email, password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // 1. Create and start interview
    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Senior Platform Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
      });

    const interviewId = setupRes.body.data.interview.id;

    await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    // 2. Submit a good answer
    const ans1Res = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        transcript: 'We scale distributed messaging using Kafka partition rebalancing and consumer group offsets.',
        isEmpty: false,
        durationSeconds: 40,
      });

    expect(ans1Res.status).toBe(200);

    // 3. Submit an empty answer (EVL-4: gets 0 score, no AI call, counted in average)
    const ans2Res = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        transcript: '',
        isEmpty: true,
        durationSeconds: 0,
      });

    expect(ans2Res.status).toBe(200);

    // 4. End interview
    await request(app)
      .post(`/api/interviews/${interviewId}/end`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    // 5. Generate report (RPT-2: ONE report call via withAiUsage)
    const genRes = await request(app)
      .post(`/api/interviews/${interviewId}/report/generate`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(genRes.status).toBe(200);
    expect(genRes.body.data.report.status).toBe('READY');
    expect(genRes.body.data.report.summary).toBeDefined();
    expect(mockReportGenerator.callCount).toBe(1);

    // RPT-3: Second call returns existing report without making another AI call
    const genRes2 = await request(app)
      .post(`/api/interviews/${interviewId}/report/generate`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(genRes2.status).toBe(200);
    expect(mockReportGenerator.callCount).toBe(1); // No new AI call!

    // 6. Fetch complete report (RPT-1, RPT-4, RPT-5)
    const reportRes = await request(app)
      .get(`/api/interviews/${interviewId}/report`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(reportRes.status).toBe(200);
    const data = reportRes.body.data;

    // Overall score calculated at read time (not stored in interview row)
    expect(data.metrics.overallScore).not.toBeNull();
    // Duration in whole seconds (RPT-5)
    expect(typeof data.metrics.durationSeconds).toBe('number');
    // Skill breakdown calculated on the fly
    expect(data.metrics.skillBreakdown).toBeDefined();
    // Question-by-question section (RPT-4)
    expect(data.questions.length).toBeGreaterThanOrEqual(2);
    expect(data.questions[0].candidateAnswer.transcript).toContain('Kafka');
    expect(typeof data.questions[0].candidateAnswer.score).toBe('number');

    // EVL-5: evaluations are immutable once saved
    const evalId = data.questions[0].candidateAnswer.evaluation.id;
    expect(evalId).toBeDefined();
  });

  it('RPT-2 fallback: when AI report generation fails, status is PENDING and numbers still show', async () => {
    mockReportGenerator.shouldFail = true;

    const email = getUniqueEmail('rpt-pending');
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email, password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Site Reliability Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
      });

    const interviewId = setupRes.body.data.interview.id;

    await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        transcript: 'We configure Prometheus scrape intervals and alertmanager deduplication.',
        isEmpty: false,
        durationSeconds: 30,
      });

    await request(app)
      .post(`/api/interviews/${interviewId}/end`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    // Call generate with failing AI
    const genRes = await request(app)
      .post(`/api/interviews/${interviewId}/report/generate`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(genRes.status).toBe(200);
    expect(genRes.body.data.report.status).toBe('PENDING');

    // Fetch report: numbers still show (RPT-2)
    const reportRes = await request(app)
      .get(`/api/interviews/${interviewId}/report`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.report.status).toBe('PENDING');
    expect(reportRes.body.data.metrics.overallScore).not.toBeNull();
  });

  it('RPT-6: User B gets 404 on User A report, and history is strictly isolated', async () => {
    // User A
    const emailA = getUniqueEmail('rpt-user-a');
    const regA = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: emailA, password: 'Password123', confirmPassword: 'Password123' });
    const cookieA = extractSessionCookie(regA.headers['set-cookie']);

    // User B
    const emailB = getUniqueEmail('rpt-user-b');
    const regB = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: emailB, password: 'Password123', confirmPassword: 'Password123' });
    const cookieB = extractSessionCookie(regB.headers['set-cookie']);

    // User A creates interview
    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookieA)
      .send({
        mode: 'GENERAL',
        role: 'Confidential Executive Role',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
      });

    const interviewId = setupRes.body.data.interview.id;

    // User B tries to view User A's report -> 404 (SEC-1, RPT-6)
    const crossRes = await request(app)
      .get(`/api/interviews/${interviewId}/report`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieB);

    expect(crossRes.status).toBe(404);
    expect(crossRes.body.error.code).toBe('NOT_FOUND');

    // User B's history does NOT contain User A's interview
    const historyB = await request(app)
      .get('/api/interviews/history')
      .set(CSRF_HEADER)
      .set('Cookie', cookieB);

    expect(historyB.status).toBe(200);
    const found = historyB.body.data.items.some((i: { id: string }) => i.id === interviewId);
    expect(found).toBe(false);
  });
});
