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
  MockReportGenerator,
  setReportGenerator,
  resetReportGenerator,
} from '../../src/services/report/reportService.js';
import {
  InMemoryStorageAdapter,
  setStorageAdapter,
  resetStorageAdapter,
} from '../../src/services/storage/imagekitAdapter.js';
import {
  MockDocumentSummarizer,
  setDocumentSummarizer,
  resetDocumentSummarizer,
} from '../../src/services/documents/documentSummaryService.js';
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

function getUniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function createValidPdfBuffer(textContent: string): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length ${textContent.length + 20} >>
stream
BT
/F1 12 Tf
100 700 Td
(${textContent}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;
  return Buffer.from(content, 'utf8');
}

describe('Phase 15 — Full End-to-End User Flow & Integration Verification', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  const mockStorage = new InMemoryStorageAdapter();
  const mockSummarizer = new MockDocumentSummarizer();
  const mockEmbeddingGen = new MockEmbeddingGenerator();
  let mockPlanGenerator: MockInterviewPlanGenerator;
  let mockTurnEvaluator: MockTurnEvaluator;
  let mockReportGenerator: MockReportGenerator;

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  }, 60000);

  beforeEach(() => {
    resetAllRateLimits();
    setStorageAdapter(mockStorage);
    setDocumentSummarizer(mockSummarizer);
    setEmbeddingGenerator(mockEmbeddingGen);
    mockStorage.clear();

    mockPlanGenerator = new MockInterviewPlanGenerator();
    setInterviewPlanGenerator(mockPlanGenerator);
    mockTurnEvaluator = new MockTurnEvaluator();
    setTurnEvaluator(mockTurnEvaluator);
    mockReportGenerator = new MockReportGenerator();
    setReportGenerator(mockReportGenerator);
  });

  afterEach(() => {
    resetStorageAdapter();
    resetDocumentSummarizer();
    resetEmbeddingGenerator();
    resetInterviewPlanGenerator();
    resetTurnEvaluator();
    resetReportGenerator();
  });

  it('runs complete lifecycle: Register -> Profile -> CV Upload -> Setup -> Room -> Answer -> Report -> Dashboard', async () => {
    // 1. Candidate Registration
    const candidateEmail = getUniqueEmail('candidate-e2e');
    const password = 'StrongPassword123!';
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: candidateEmail,
        password,
        confirmPassword: password,
      });

    expect(regRes.status).toBe(201);
    const sessionCookie = extractSessionCookie(regRes.headers['set-cookie']);
    expect(sessionCookie).toBeTruthy();

    // 2. Profile Onboarding
    const profileRes = await request(app)
      .put('/api/users/me/profile')
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie)
      .send({
        fullName: 'Alex Vance',
        targetRole: 'Senior Distributed Systems Engineer',
        experienceLevel: 'EXPERIENCED',
        statusType: 'PROFESSIONAL',
        careerGoals: 'Master distributed consensus and scale architecture',
      });

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.user.profile.fullName).toBe('Alex Vance');
    expect(profileRes.body.data.user.profile.targetRole).toBe('Senior Distributed Systems Engineer');

    // 3. Document Upload (CV / Resume)
    const docRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie)
      .field('type', 'CV')
      .attach(
        'file',
        createValidPdfBuffer('Alex Vance - 8 years experience building distributed Raft consensus clusters'),
        'alex-vance-resume.pdf'
      );

    expect(docRes.status).toBe(201);
    const cvDocId = docRes.body.data.document.id;
    expect(cvDocId).toBeTruthy();

    // 4. Interview Setup with Grounded Plan (CV-based, TECHNICAL)
    const setupRes = await request(app)
      .post('/api/interviews')
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie)
      .send({
        mode: 'CV_BASED',
        role: 'Distributed Systems Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 15,
        cvDocumentId: cvDocId,
      });

    expect(setupRes.status).toBe(201);
    const interviewId = setupRes.body.data.interview.id;
    expect(interviewId).toBeTruthy();
    expect(setupRes.body.data.interview.status).toBe('CREATED');

    // 5. Start Interview Session & Enter Room
    const startRes = await request(app)
      .post(`/api/interviews/${interviewId}/start`)
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie);

    expect(startRes.status).toBe(200);
    expect(startRes.body.data.state.currentQuestion).toBeDefined();

    // Verify room state recovery / reload
    const stateRes = await request(app)
      .get(`/api/interviews/${interviewId}/state`)
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie);

    expect(stateRes.status).toBe(200);
    expect(stateRes.body.data.state.id).toBe(interviewId);
    expect(stateRes.body.data.state.currentQuestion).toBeDefined();
    expect(stateRes.body.data.state.currentQuestion.id).toBeTruthy();

    // 6. Submit Answer to Question
    const answerRes = await request(app)
      .post(`/api/interviews/${interviewId}/answer`)
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie)
      .send({
        transcript: 'In my previous role at CloudCorp, I led the migration of a monolithic database to a distributed Raft-based consensus cluster. We reduced cross-datacenter latency by 45% while maintaining strict serializability.',
        isEmpty: false,
        durationSeconds: 45,
      });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.data.state).toBeDefined();

    // 7. Complete the interview session
    const endRes = await request(app)
      .post(`/api/interviews/${interviewId}/end`)
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie);
    expect(endRes.status).toBe(200);

    // 8. Generate Comprehensive Evaluation Report
    const generateRes = await request(app)
      .post(`/api/interviews/${interviewId}/report/generate`)
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie);

    expect(generateRes.status).toBe(200);
    expect(generateRes.body.data.report).toBeDefined();
    expect(generateRes.body.data.report.status).toBe('READY');

    // 9. Fetch Report via Candidate API
    const getReportRes = await request(app)
      .get(`/api/interviews/${interviewId}/report`)
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie);

    expect(getReportRes.status).toBe(200);
    expect(getReportRes.body.data.interview.id).toBe(interviewId);
    expect(getReportRes.body.data.metrics.overallScore).not.toBeNull();
    expect(getReportRes.body.data.metrics.skillBreakdown).toBeDefined();
    const calculatedOverallScore = getReportRes.body.data.metrics.overallScore;

    // 10. Candidate Dashboard reflects updated metrics (zero AI calls, calculated values)
    const dashboardRes = await request(app)
      .get('/api/users/dashboard')
      .set(CSRF_HEADER)
      .set('Cookie', sessionCookie);

    expect(dashboardRes.status).toBe(200);
    const stats = dashboardRes.body.data.statistics;
    expect(stats.totalInterviews).toBe(1);
    expect(stats.completedInterviews).toBe(1);
    expect(stats.averageScore).toBe(calculatedOverallScore);
    expect(stats.recentTrend).toContain(calculatedOverallScore);
    expect(dashboardRes.body.data.recommendations).toBeDefined();

    // 11. Isolation verification: Another candidate receives 404 (SEC-2, never 403)
    const otherCandidateEmail = getUniqueEmail('candidate-b');
    const otherRegRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: otherCandidateEmail,
        password,
        confirmPassword: password,
      });
    const otherCookie = extractSessionCookie(otherRegRes.headers['set-cookie']);

    // Another candidate tries to access interview -> 404
    const otherInterviewAccess = await request(app)
      .get(`/api/interviews/${interviewId}/state`)
      .set(CSRF_HEADER)
      .set('Cookie', otherCookie);
    expect(otherInterviewAccess.status).toBe(404);

    // Another candidate tries to access CV -> 404
    const otherDocAccess = await request(app)
      .get(`/api/documents/${cvDocId}`)
      .set(CSRF_HEADER)
      .set('Cookie', otherCookie);
    expect(otherDocAccess.status).toBe(404);

    // Another candidate tries to access report -> 404
    const otherReportAccess = await request(app)
      .get(`/api/interviews/${interviewId}/report`)
      .set(CSRF_HEADER)
      .set('Cookie', otherCookie);
    expect(otherReportAccess.status).toBe(404);
  });
});
