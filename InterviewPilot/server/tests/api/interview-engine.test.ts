import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';
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
  MockInquiryAnswerer,
  setInquiryAnswerer,
  resetInquiryAnswerer,
} from '../../src/services/interviewEngine/inquiryService.js';

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

describe('Phase 7 — Interview Engine (LangGraph.js) (ENG-1 to ENG-10, QTA-12)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  let mockPlanGenerator: MockInterviewPlanGenerator;
  let mockTurnEvaluator: MockTurnEvaluator;
  let mockInquiryAnswerer: MockInquiryAnswerer;

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
    mockInquiryAnswerer = new MockInquiryAnswerer();
    setInquiryAnswerer(mockInquiryAnswerer);
  });

  afterEach(() => {
    resetInterviewPlanGenerator();
    resetTurnEvaluator();
    resetInquiryAnswerer();
  });

  it('ENG-1 & ENG-2: starts interview CREATED -> IN_PROGRESS, sets RECRUITER_SPEAKING, and reloads from DB', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('engine-start'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // 1. Create interview
    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Distributed Systems Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });

    expect(createRes.status).toBe(201);
    const interviewId = createRes.body.data.interview.id;

    // 2. Start interview
    const startRes = await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(startRes.status).toBe(200);
    const state = startRes.body.data.state;
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.runtimeState).toBe('RECRUITER_SPEAKING');
    expect(state.recruiterUtterance).toBeTruthy();
    expect(state.currentQuestion).toBeTruthy();
    expect(state.currentQuestion.orderIndex).toBe(1);

    // 3. Database state check (ENG-1: state is saved to PostgreSQL, survives restart)
    const dbInterview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    expect(dbInterview?.status).toBe('IN_PROGRESS');
    expect(dbInterview?.runtimeState).toBe('RECRUITER_SPEAKING');
    expect(dbInterview?.startedAt).not.toBeNull();

    // 4. Polling state endpoint
    const getStateRes = await request(app)
      .get(`/api/interviews/${interviewId}/state`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(getStateRes.status).toBe(200);
    expect(getStateRes.body.data.state.id).toBe(interviewId);
    expect(getStateRes.body.data.state.status).toBe('IN_PROGRESS');
  });

  it('ENG-3 & ENG-7: submits text answer with adaptive branching and at most 1 AI evaluation call', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('engine-adaptive'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Backend Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });
    const interviewId = createRes.body.data.interview.id;

    await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    // High quality answer -> triggers FOLLOW_UP_DEEPER and steps difficulty UP to HARD
    const initialCallCount = mockTurnEvaluator.callCount;
    const answerRes = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        transcript: 'I have expert experience designing high scale distributed systems using Kafka and Redis token buckets for optimal performance.',
      });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.data.decision).toBe('FOLLOW_UP_DEEPER');
    expect(answerRes.body.data.evaluation.overallScore).toBeGreaterThanOrEqual(75);
    expect(answerRes.body.data.state.currentDifficulty).toBe('HARD');
    expect(answerRes.body.data.state.currentQuestion.kind).toBe('FOLLOW_UP');
    expect(answerRes.body.data.state.currentQuestion.orderIndex).toBe(2);

    // ENG-7: Exactly 1 AI evaluation call for this answer
    expect(mockTurnEvaluator.callCount - initialCallCount).toBe(1);

    // Verify CandidateAnswer and AnswerEvaluation rows exist in PostgreSQL
    const answerRows = await prisma.candidateAnswer.findMany({
      where: { interviewId },
      include: { evaluation: true },
    });
    expect(answerRows.length).toBe(1);
    expect(answerRows[0].evaluation?.overallScore).toBeGreaterThanOrEqual(75);
  });

  it('VOI-4 & EVL-4 & ENG-7: empty answer makes ZERO AI calls, assigns 0 score, and advances to NEXT_TOPIC', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('empty-eval'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'DevOps Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });
    const interviewId = createRes.body.data.interview.id;

    await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    const initialCallCount = mockTurnEvaluator.callCount;

    // Submit empty answer
    const emptyRes = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        transcript: '',
        isEmpty: true,
      });

    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.data.evaluation.isEmpty).toBe(true);
    expect(emptyRes.body.data.evaluation.overallScore).toBe(0);
    expect(emptyRes.body.data.decision).toBe('NEXT_TOPIC');

    // ENG-7 & VOI-4: Zero AI calls made!
    expect(mockTurnEvaluator.callCount).toBe(initialCallCount);

    // Question advanced to orderIndex 2
    expect(emptyRes.body.data.state.currentQuestion.orderIndex).toBe(2);
  });

  it('ENG-10: candidate inquiry answers clarification, keeps pending question, and respects limit', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('inquiry-test'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id;

    // Limit inquiries to 1 for this test
    await prisma.userQuota.create({
      data: {
        userId,
        maxInquiriesPerInterview: 1,
      },
    });

    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Frontend Architect',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
      });
    const interviewId = createRes.body.data.interview.id;

    const startRes = await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    const originalQuestionText = startRes.body.data.state.currentQuestion.text;
    const originalQuestionIndex = startRes.body.data.state.currentQuestion.orderIndex;

    // 1. Submit first inquiry -> succeeds
    const inqRes1 = await request(app)
      .post(`/api/interviews/${interviewId}/inquiry`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ inquiry: 'Should I consider server-side rendering or static generation?' });

    expect(inqRes1.status).toBe(200);
    expect(inqRes1.body.data.reply).toBeTruthy();
    expect(inqRes1.body.data.state.inquiriesCount).toBe(1);

    // ENG-10: Same pending question and order index remains!
    expect(inqRes1.body.data.state.currentQuestion.text).toBe(originalQuestionText);
    expect(inqRes1.body.data.state.currentQuestion.orderIndex).toBe(originalQuestionIndex);

    // 2. Submit second inquiry when limit is 1 -> 422 INQUIRY_LIMIT_REACHED
    const inqRes2 = await request(app)
      .post(`/api/interviews/${interviewId}/inquiry`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ inquiry: 'What about edge hydration?' });

    expect(inqRes2.status).toBe(422);
    expect(inqRes2.body.error.code).toBe('INQUIRY_LIMIT_REACHED');
  });

  it('QTA-12: Client-Request-Id idempotency returns stored result with no new AI call', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('idempotent-engine'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Site Reliability Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });
    const interviewId = createRes.body.data.interview.id;

    await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    const clientReqId = 'req-unique-token-12345';

    // First call with clientRequestId
    const call1 = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .set('Client-Request-Id', clientReqId)
      .send({ transcript: 'We utilize Prometheus alerts and distributed tracing for reliability.' });

    expect(call1.status).toBe(200);
    const eval1 = call1.body.data.evaluation;
    const callCountAfterFirst = mockTurnEvaluator.callCount;

    // Second call with same clientRequestId -> returns previous response, NO new AI call!
    const call2 = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .set('Client-Request-Id', clientReqId)
      .send({ transcript: 'We utilize Prometheus alerts and distributed tracing for reliability.' });

    expect(call2.status).toBe(200);
    expect(call2.body.data.evaluation.overallScore).toBe(eval1.overallScore);
    expect(mockTurnEvaluator.callCount).toBe(callCountAfterFirst); // No new AI call!
  });

  it('ENG-9 & SEC-1: ends interview early, makes status terminal, and returns 404 for another user', async () => {
    const regResA = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('owner-a'), password: 'Password123', confirmPassword: 'Password123' });
    const cookieA = extractSessionCookie(regResA.headers['set-cookie']);

    const regResB = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('intruder-b'), password: 'Password123', confirmPassword: 'Password123' });
    const cookieB = extractSessionCookie(regResB.headers['set-cookie']);

    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookieA)
      .send({
        mode: 'GENERAL',
        role: 'Data Scientist',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });
    const interviewId = createRes.body.data.interview.id;

    // SEC-1: User B attempting to start User A's interview gets 404 (not 403)
    const intruderRes = await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieB);
    expect(intruderRes.status).toBe(404);

    // User A starts interview
    await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieA);

    // User A ends interview early
    const endRes = await request(app)
      .post(`/api/interviews/${interviewId}/end`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieA);

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.state.status).toBe('ENDED_EARLY');
    expect(endRes.body.data.state.runtimeState).toBe('INTERVIEW_COMPLETED');
    expect(endRes.body.data.state.isTerminal).toBe(true);

    // Submitting answer to terminal interview fails with 400
    const failAnswerRes = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieA)
      .send({ transcript: 'Late answer after completion' });

    expect(failAnswerRes.status).toBe(400);
    expect(failAnswerRes.body.error.code).toBe('INTERVIEW_NOT_ACTIVE');
  });
});
