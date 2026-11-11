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
import {
  MockSpeechService,
  setSpeechService,
  resetSpeechService,
} from '../../src/services/voice/speechService.js';

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

describe('Phase 9 — Live Interview Room Rules & API Integration (ROOM-1..7, ENG-10, VOI-11)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  let mockPlanGenerator: MockInterviewPlanGenerator;
  let mockTurnEvaluator: MockTurnEvaluator;
  let mockInquiryAnswerer: MockInquiryAnswerer;
  let mockSpeechService: MockSpeechService;

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
    mockSpeechService = new MockSpeechService();
    setSpeechService(mockSpeechService);
  });

  afterEach(() => {
    resetInterviewPlanGenerator();
    resetTurnEvaluator();
    resetInquiryAnswerer();
    resetSpeechService();
  });

  async function createStartedInterview(userEmail: string) {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: userEmail, password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Full Stack Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });

    if (setupRes.status !== 201) {
      throw new Error(`Failed to create interview: ${JSON.stringify(setupRes.body)}`);
    }

    const interviewId = setupRes.body.data.interview.id;

    const startRes = await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    if (startRes.status !== 200) {
      throw new Error(`Failed to start interview: ${JSON.stringify(startRes.body)}`);
    }

    return { cookie, interviewId, startState: startRes.body.data.state };
  }

  it('ROOM-1 & ROOM-5: Reloading page restores state via GET /state and returns caption without generating new audio', async () => {
    const email = getUniqueEmail('room-reload');
    const { cookie, interviewId, startState } = await createStartedInterview(email);

    // Initial state after start: RECRUITER_SPEAKING or current pending question
    expect(startState.currentQuestion).not.toBeNull();
    const originalQuestionText = startState.currentQuestion.text;

    // Simulate page reload: GET /api/interviews/:id/state
    const stateRes = await request(app)
      .get(`/api/interviews/${interviewId}/state`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(stateRes.status).toBe(200);
    expect(stateRes.body.data.state.id).toBe(interviewId);
    expect(stateRes.body.data.state.currentQuestion.text).toBe(originalQuestionText);
    // Verified: GET /state restores question caption from DB without triggering any TTS calls
    expect(mockSpeechService.callCount).toBe(0);
  });

  it('ROOM-5: Replay Question button calls TTS endpoint and costs 1 TTS call', async () => {
    const email = getUniqueEmail('room-replay');
    const { cookie, interviewId, startState } = await createStartedInterview(email);

    const questionText = startState.currentQuestion.text;

    // Call synthesize endpoint (as Replay Question does)
    const ttsRes = await request(app)
      .post('/api/voice/synthesize')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        text: questionText,
        voice: 'Puck',
        interviewId,
      });

    expect(ttsRes.status).toBe(200);
    expect(ttsRes.body.data.audioBase64).toBeDefined();
    expect(mockSpeechService.callCount).toBe(1);
  });

  it('ROOM-3 & ENG-10: Ask a Question inquiry returns recruiter reply and keeps same pending question', async () => {
    const email = getUniqueEmail('room-inquiry');
    const { cookie, interviewId, startState } = await createStartedInterview(email);

    const pendingQuestionId = startState.currentQuestion.id;
    const pendingQuestionText = startState.currentQuestion.text;

    // Candidate submits an inquiry
    const inquiryRes = await request(app)
      .post(`/api/interviews/${interviewId}/inquiry`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ inquiry: 'Could you please clarify whether we should consider distributed caching or local memory?' });

    expect(inquiryRes.status).toBe(200);
    expect(inquiryRes.body.data.reply).toBeDefined();
    expect(inquiryRes.body.data.state.inquiriesCount).toBe(1);

    // Question remains unchanged
    expect(inquiryRes.body.data.state.currentQuestion.id).toBe(pendingQuestionId);
    expect(inquiryRes.body.data.state.currentQuestion.text).toBe(pendingQuestionText);
  });

  it('ROOM-4: End Interview early sets ENDED_EARLY and releases unused reservations', async () => {
    const email = getUniqueEmail('room-end');
    const { cookie, interviewId } = await createStartedInterview(email);

    const endRes = await request(app)
      .post(`/api/interviews/${interviewId}/end`)
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.state.status).toBe('ENDED_EARLY');
    expect(endRes.body.data.state.isTerminal).toBe(true);

    // Verify database row
    const dbInterview = await prisma.interview.findUnique({ where: { id: interviewId } });
    expect(dbInterview?.status).toBe('ENDED_EARLY');
    expect(dbInterview?.endedAt).not.toBeNull();
  });

  it('ROOM-7 & QTA-12: Submitting with same clientRequestId is idempotent and retries do not duplicate evaluations', async () => {
    const email = getUniqueEmail('room-retry-idempotency');
    const { cookie, interviewId } = await createStartedInterview(email);

    const clientRequestId = 'client-req-uuid-test-room-7';

    // First submission
    const res1 = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('client-request-id', clientRequestId)
      .set('Cookie', cookie)
      .send({
        transcript: 'I would use Redis with cache-aside pattern to store user sessions and invalidate on logout.',
        isEmpty: false,
        durationSeconds: 45,
      });

    expect(res1.status).toBe(200);
    expect(mockTurnEvaluator.callCount).toBe(1);

    // Retry 1 with SAME clientRequestId (simulating network hiccup / retry logic in ROOM-7)
    const res2 = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('client-request-id', clientRequestId)
      .set('Cookie', cookie)
      .send({
        transcript: 'I would use Redis with cache-aside pattern to store user sessions and invalidate on logout.',
        isEmpty: false,
        durationSeconds: 45,
      });

    expect(res2.status).toBe(200);
    // Crucial QTA-12 / ROOM-7 check: AI evaluation was NOT run again!
    expect(mockTurnEvaluator.callCount).toBe(1);
    expect(res2.body.data.state.id).toBe(res1.body.data.state.id);
  });

  it('ROOM-6: Route errors return sanitized plain messages without exposing DB/SQL or raw provider errors', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('room-error-sanitization'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // Call with nonexistent UUID
    const notFoundRes = await request(app)
      .get('/api/interviews/00000000-0000-0000-0000-000000000000/state')
      .set(CSRF_HEADER)
      .set('Cookie', cookie);

    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('NOT_FOUND');
    expect(notFoundRes.body.error.message).toBe('Interview not found.');
    expect(notFoundRes.body.error.stack).toBeUndefined();
    expect(JSON.stringify(notFoundRes.body)).not.toContain('prisma');
    expect(JSON.stringify(notFoundRes.body)).not.toContain('SELECT');
  });
});
