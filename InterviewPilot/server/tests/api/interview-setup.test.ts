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
  MockEmbeddingGenerator,
  setEmbeddingGenerator,
  resetEmbeddingGenerator,
} from '../../src/services/rag/embeddingService.js';

const CSRF_HEADER = { 'X-Requested-With': 'InterviewPilot' };

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const ipCookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  return ipCookie ? ipCookie.split(';')[0] : '';
}

describe('Phase 6 — Interview Setup & Plan Generation (SET-1 to SET-5, QTA-9, QTA-11, QTA-14)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  const mockPlanGen = new MockInterviewPlanGenerator();
  const mockEmbedGen = new MockEmbeddingGenerator();

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  });

  beforeEach(async () => {
    resetAllRateLimits();
    setInterviewPlanGenerator(mockPlanGen);
    setEmbeddingGenerator(mockEmbedGen);
    mockPlanGen.callCount = 0;

    await prisma.$transaction([
      prisma.interviewQuestion.deleteMany({}),
      prisma.interviewConfiguration.deleteMany({}),
      prisma.interview.deleteMany({}),
      prisma.documentChunk.deleteMany({}),
      prisma.uploadedDocument.deleteMany({}),
      prisma.aIUsageRecord.deleteMany({}),
      prisma.usageCounter.deleteMany({}),
      prisma.userQuota.deleteMany({}),
      prisma.passwordResetToken.deleteMany({}),
      prisma.userProfile.deleteMany({}),
      prisma.user.deleteMany({ where: { role: 'USER' } }),
    ]);
  });

  afterEach(() => {
    resetInterviewPlanGenerator();
    resetEmbeddingGenerator();
  });

  it('SET-1: validates mode requirements — GENERAL needs no documents; CV/JD modes require valid READY documents', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: 'modes-test@example.com', password: 'Password123', confirmPassword: 'Password123' });
    expect(regRes.status).toBe(201);
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id;

    // 1. GENERAL mode succeeds without document IDs
    const generalRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Frontend Architect',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });

    expect(generalRes.status).toBe(201);
    expect(generalRes.body.data.interview.mode).toBe('GENERAL');
    expect(generalRes.body.data.interview.configuration.cvDocumentId).toBeNull();

    // 2. CV_BASED mode without cvDocumentId -> 422 DOCUMENT_REQUIRED
    const cvMissingRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'CV_BASED',
        role: 'Frontend Architect',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });

    expect(cvMissingRes.status).toBe(422);
    expect(cvMissingRes.body.error.code).toBe('DOCUMENT_REQUIRED');

    // 3. Create a READY CV and FAILED JD
    const readyCv = await prisma.uploadedDocument.create({
      data: {
        userId,
        type: 'CV',
        sourceKind: 'PASTED',
        status: 'READY',
        summaryJson: { coreSkills: ['React', 'TypeScript'], projects: [{ name: 'InterviewPilot Web' }] },
      },
    });

    const failedJd = await prisma.uploadedDocument.create({
      data: {
        userId,
        type: 'JD',
        sourceKind: 'PASTED',
        status: 'FAILED',
        failureReason: 'NO_TEXT',
      },
    });

    // 4. CV_BASED with readyCv succeeds
    const cvSuccessRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'CV_BASED',
        role: 'Senior React Developer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
        cvDocumentId: readyCv.id,
      });

    expect(cvSuccessRes.status).toBe(201);
    expect(cvSuccessRes.body.data.interview.mode).toBe('CV_BASED');
    expect(cvSuccessRes.body.data.interview.configuration.cvDocumentId).toBe(readyCv.id);

    // 5. JD_BASED with failedJd -> 422 DOCUMENT_NOT_READY (RAG-8)
    const jdFailedRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'JD_BASED',
        role: 'Senior React Developer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
        jdDocumentId: failedJd.id,
      });

    expect(jdFailedRes.status).toBe(422);
    expect(jdFailedRes.body.error.code).toBe('DOCUMENT_NOT_READY');
  });

  it('QTA-9: selecting duration exceeding allowed limit returns 422 with allowed values', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: 'quota-limits@example.com', password: 'Password123', confirmPassword: 'Password123' });
    expect(regRes.status).toBe(201);
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id;

    // Set user quota override: maxDurationMinutes = 15, maxQuestions = 5
    await prisma.userQuota.create({
      data: {
        userId,
        maxDurationMinutes: 15,
        maxQuestionsPerInterview: 5,
      },
    });

    // Selecting 45 minutes on 15-minute limit -> 422 EXCEEDS_QUOTA_LIMIT
    const res = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Backend Engineer',
        experienceLevel: 'BEGINNER',
        type: 'HR',
        difficulty: 'EASY',
        durationMinutes: 45,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EXCEEDS_QUOTA_LIMIT');
    expect(res.body.error.details.allowedDurationMinutes).toBe(15);
  });

  it('SET-3: question count defaults to floor(duration / 3) capped by allowed max', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: 'question-calc@example.com', password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id;

    // Set maxQuestionsPerInterview = 8
    await prisma.userQuota.create({
      data: {
        userId,
        maxDurationMinutes: 45,
        maxQuestionsPerInterview: 8,
      },
    });

    // 1. duration 15 min -> default floor(15 / 3) = 5
    const res15 = await request(app)
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
    expect(res15.status).toBe(201);
    expect(res15.body.data.interview.configuration.maxQuestions).toBe(5);

    // 2. duration 45 min -> floor(45 / 3) = 15, but capped by quota limit 8
    const res45 = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Data Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 45,
      });
    expect(res45.status).toBe(201);
    expect(res45.body.data.interview.configuration.maxQuestions).toBe(8);
  });

  it('QTA-11: a second active interview (status IN_PROGRESS) returns 409 INTERVIEW_ALREADY_ACTIVE', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: 'active-check@example.com', password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // Create an initial interview
    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Security Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
      });
    expect(createRes.status).toBe(201);
    const firstInterviewId = createRes.body.data.interview.id;

    // Transition first interview to IN_PROGRESS
    await prisma.interview.update({
      where: { id: firstInterviewId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    // Attempt to create/start second interview while one is IN_PROGRESS -> 409
    const secondRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Security Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('INTERVIEW_ALREADY_ACTIVE');
  });

  it('QTA-14: interview counts against daily quota at creation', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: 'counter-check@example.com', password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id;

    const createRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'GENERAL',
        role: 'Cloud Architect',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
      });

    expect(createRes.status).toBe(201);

    // Check UsageCounter row for user
    const userCounter = await prisma.usageCounter.findFirst({
      where: { scopeType: 'USER', scopeId: userId },
    });
    expect(userCounter?.interviewsCreated).toBe(1);
  });

  it('SET-4 & SET-5: plan has no pre-generated follow-ups and in CV mode references a real CV item', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: 'cv-ref-test@example.com', password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    const userId = regRes.body.data.user.id;

    const cvDoc = await prisma.uploadedDocument.create({
      data: {
        userId,
        type: 'CV',
        sourceKind: 'PASTED',
        status: 'READY',
        summaryJson: {
          candidateName: 'Alex Smith',
          skills: ['PostgreSQL', 'Docker'],
          projects: [{ name: 'High Throughput Ledger', description: 'Distributed ledger system' }],
        },
      },
    });

    const res = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        mode: 'CV_BASED',
        role: 'Principal Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'HARD',
        durationMinutes: 15,
        cvDocumentId: cvDoc.id,
      });

    expect(res.status).toBe(201);
    const interview = res.body.data.interview;

    // SET-4: Plan returns greeting, topics, criteria, firstQuestion
    expect(interview.plan.greeting).toBeTruthy();
    expect(interview.plan.topics.length).toBeGreaterThan(0);
    expect(interview.plan.evaluationCriteria.length).toBeGreaterThan(0);
    expect(interview.plan.firstQuestion).toBeTruthy();

    // SET-4: Must NOT contain pre-generated follow-ups
    expect(interview.plan.followUpQuestions).toBeUndefined();
    expect(interview.plan.followUps).toBeUndefined();

    // SET-5: In CV mode at least one topic references an item from CV summary
    const combinedTopics = interview.plan.topics.join(' ');
    expect(combinedTopics).toContain('High Throughput Ledger');

    // Initial question is stored in database with orderIndex = 1
    const questions = await prisma.interviewQuestion.findMany({
      where: { interviewId: interview.id },
    });
    expect(questions.length).toBe(1);
    expect(questions[0].orderIndex).toBe(1);
    expect(questions[0].kind).toBe('MAIN');
  });
});
