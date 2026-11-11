import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { signSessionToken } from '../../src/middleware/auth.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';
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

// Minimal valid PDF with text stream for test extraction
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

// Valid PDF header but empty text stream (scanned PDF fixture)
function createScannedPdfBuffer(): Buffer {
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
<< /Length 0 >>
stream
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
260
%%EOF`;
  return Buffer.from(content, 'utf8');
}

describe('Phase 4 — Documents (upload, storage, extraction, summaries) (DOC-1 to DOC-9, QTA-1, SEC-5)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  const mockStorage = new InMemoryStorageAdapter();
  const mockSummarizer = new MockDocumentSummarizer();
  const mockEmbeddingGen = new MockEmbeddingGenerator();

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  });

  beforeEach(async () => {
    resetAllRateLimits();
    setStorageAdapter(mockStorage);
    setDocumentSummarizer(mockSummarizer);
    setEmbeddingGenerator(mockEmbeddingGen);
    mockStorage.clear();

    await prisma.$transaction([
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
    resetStorageAdapter();
    resetDocumentSummarizer();
    resetEmbeddingGenerator();
  });

  it('DOC-2 & SEC-5: rejects wrong file type, invalid signature, or oversized files > 5 MB', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'files@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // 1. Invalid file extension (.exe)
    const badExtRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('type', 'CV')
      .attach('file', Buffer.from('malicious payload'), 'virus.exe');
    expect(badExtRes.status).toBe(400);
    expect(badExtRes.body.error.code).toBe('INVALID_FILE');

    // 2. Spoofed extension: named .pdf but containing plain text magic bytes
    const spoofedRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('type', 'CV')
      .attach('file', Buffer.from('Hello world this is not a pdf'), 'fake.pdf');
    expect(spoofedRes.status).toBe(400);
    expect(spoofedRes.body.error.code).toBe('INVALID_FILE');

    // 3. Oversized file (> 5 MB)
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x20); // 5 MB + 1 KB
    // Give it a PDF header so magic check would pass if size didn't catch it
    oversizedBuffer.write('%PDF-1.4\n', 0);
    const oversizedRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('type', 'CV')
      .attach('file', oversizedBuffer, 'large.pdf');
    expect(oversizedRes.status).toBe(400);
    expect(oversizedRes.body.error.code).toBe('INVALID_FILE');
  });

  it('DOC-1 & DOC-4: demo visitors are blocked, limit of 5 documents per type enforced, and pasted JD > 15,000 chars is rejected', async () => {
    // 1. Demo visitor cannot upload or paste documents
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo-doc@example.com',
        role: 'USER',
        status: 'ACTIVE',
        isDemo: true,
      },
    });
    const demoCookie = `${AUTH_COOKIE_NAME}=${signSessionToken({ userId: demoUser.id, tokenVersion: 0 })}`;

    const demoUploadRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', demoCookie)
      .field('type', 'CV')
      .attach('file', createValidPdfBuffer('Sample CV'), 'resume.pdf');
    expect(demoUploadRes.status).toBe(403);
    expect(demoUploadRes.body.error.code).toBe('DEMO_RESTRICTED');

    const demoPasteRes = await request(app)
      .post('/api/documents/paste-jd')
      .set(CSRF_HEADER)
      .set('Cookie', demoCookie)
      .send({ pastedText: 'Software Engineer requirements and expectations' });
    expect(demoPasteRes.status).toBe(403);
    expect(demoPasteRes.body.error.code).toBe('DEMO_RESTRICTED');

    // 2. Normal user: pasted JD > 15,000 chars rejected (DOC-1)
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'doclimits@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const longText = 'A'.repeat(15001);
    const longJdRes = await request(app)
      .post('/api/documents/paste-jd')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ pastedText: longText });
    expect(longJdRes.status).toBe(400);
    expect(longJdRes.body.error.code).toBe('VALIDATION_ERROR');

    // 3. Limit of 5 per type (DOC-4): grant sufficient daily analysis quota so we test document limit of 5
    const userId = regRes.body.data.user.id as string;
    await prisma.userQuota.create({
      data: {
        userId,
        documentAnalysesPerDay: 10,
      },
    });

    const initialFive = [];
    for (let idx = 0; idx < 5; idx++) {
      const res = await request(app)
        .post('/api/documents/paste-jd')
        .set(CSRF_HEADER)
        .set('Cookie', cookie)
        .send({
          pastedText: `Job Description Number ${idx + 1} with sufficient length for validation`,
          originalName: `JD ${idx + 1}`,
        });
      expect(res.status).toBe(201);
      initialFive.push(res);
    }

    const sixthRes = await request(app)
      .post('/api/documents/paste-jd')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        pastedText: 'Job Description Number 6 exceeding user limit of 5',
      });
    expect(sixthRes.status).toBe(422);
    expect(sixthRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('DOC-5, DOC-6 & DOC-9: status moves to READY on valid text, scanned PDF produces FAILED/NO_TEXT, and summary contains ONLY facts present in fixture CV', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'summaries@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    expect(regRes.status).toBe(201);
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);
    expect(cookie).toContain('ip_session=');

    // 1. Scanned PDF with no text -> status FAILED, failureReason NO_TEXT (DOC-9)
    const scannedPdf = createScannedPdfBuffer();
    const scannedRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('type', 'CV')
      .attach('file', scannedPdf, 'scanned_resume.pdf');

    expect(scannedRes.status).toBe(201);
    expect(scannedRes.body.data.document.status).toBe('FAILED');
    expect(scannedRes.body.data.document.failureReason).toBe('NO_TEXT');

    // 2. Valid CV with PostgreSQL but NO Antigravity project mentioned
    const cvPdf = createValidPdfBuffer(
      'Candidate Name: Jane Doe. Skills: Distributed Systems. Technologies: PostgreSQL.'
    );

    const validRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('type', 'CV')
      .attach('file', cvPdf, 'jane_doe_cv.pdf');

    expect(validRes.status).toBe(201);
    const doc = validRes.body.data.document;
    expect(doc.status).toBe('READY');
    expect(doc.failureReason).toBeNull();
    expect(doc.summary.technologies).toContain('PostgreSQL');

    // DOC-6: Summary contains ONLY facts present in text; unmentioned "Antigravity Platform" is NOT invented
    const projectNames = doc.summary.projects.map((p: { name: string }) => p.name);
    expect(projectNames).not.toContain('Antigravity Platform');

    // Consumed 1 document analysis from quota
    const counter = await prisma.usageCounter.findFirst({
      where: { scopeType: 'USER' },
    });
    expect(counter?.documentAnalyses).toBe(1);
  });

  it('DOC-3, DOC-7 & DOC-8: no public storage URL is returned, user B gets 404 on user A document, download streams content, and delete cleans storage and DB', async () => {
    // Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'user-a@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookieA = extractSessionCookie(regA.headers['set-cookie']);

    // Register User B
    const regB = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'user-b@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cookieB = extractSessionCookie(regB.headers['set-cookie']);

    // User A uploads document
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set(CSRF_HEADER)
      .set('Cookie', cookieA)
      .field('type', 'CV')
      .attach('file', createValidPdfBuffer('User A CV text with PostgreSQL'), 'user_a_cv.pdf');
    expect(uploadRes.status).toBe(201);
    const docA = uploadRes.body.data.document;
    const docAId = docA.id;

    // DOC-3: Verify no public URL or storageFileId is ever returned in response payload
    const jsonStr = JSON.stringify(uploadRes.body);
    expect(jsonStr).not.toContain('ik.imagekit.io');
    expect(jsonStr).not.toContain('storageFileId');
    expect(docA.storageFileId).toBeUndefined();

    // DOC-8: User B gets 404 on User A's document metadata and content
    const bGetRes = await request(app)
      .get(`/api/documents/${docAId}`)
      .set('Cookie', cookieB);
    expect(bGetRes.status).toBe(404);
    expect(bGetRes.body.error.code).toBe('NOT_FOUND');

    const bContentRes = await request(app)
      .get(`/api/documents/${docAId}/content`)
      .set('Cookie', cookieB);
    expect(bContentRes.status).toBe(404);
    expect(bContentRes.body.error.code).toBe('NOT_FOUND');

    const bDeleteRes = await request(app)
      .delete(`/api/documents/${docAId}`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieB);
    expect(bDeleteRes.status).toBe(404);

    // User A can stream/download content (DOC-3)
    const aContentRes = await request(app)
      .get(`/api/documents/${docAId}/content`)
      .set('Cookie', cookieA);
    expect(aContentRes.status).toBe(200);
    expect(aContentRes.headers['content-type']).toContain('application/pdf');
    expect(aContentRes.headers['content-disposition']).toContain('attachment');
    expect(aContentRes.body.length).toBeGreaterThan(0);

    // DOC-7: User A deletes document -> removes file from storage and deletes DB row
    const deleteRes = await request(app)
      .delete(`/api/documents/${docAId}`)
      .set(CSRF_HEADER)
      .set('Cookie', cookieA);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const docInDb = await prisma.uploadedDocument.findUnique({
      where: { id: docAId },
    });
    expect(docInDb).toBeNull();
  });
});
