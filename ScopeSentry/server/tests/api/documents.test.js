import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { User } from '../../src/models/User.js';
import { Project } from '../../src/models/Project.js';
import { Document } from '../../src/models/Document.js';
import { Investigation } from '../../src/models/Investigation.js';
import {
  setImageKitMock,
  clearImageKitMock
} from '../../src/integrations/storage.js';
import {
  setTextExtractionMock,
  clearTextExtractionMock
} from '../../src/services/textExtractionService.js';
import { sanitizeFilename } from '../../src/utils/sanitizer.js';

describe('Phase 4: Documents and Text Extraction (BR-D1 to BR-D9)', () => {
  let app;
  let userA;
  let cookieA;
  let cookieB;
  let csrfA;
  let projectA;

  // Minimal valid PDF binary fixture with %PDF magic bytes
  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 25 >>\nstream\nScope Specification Text\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000192 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n268\n%%EOF'
  );

  // Minimal valid DOCX binary fixture with PK\x03\x04 zip header
  const validDocxBuffer = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00,
    0x00, 0x00, 0x21, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    clearImageKitMock();
    clearTextExtractionMock();

    await User.deleteMany({ email: { $in: ['docuser_a@test.com', 'docuser_b@test.com'] } });
    await Project.deleteMany({});
    await Document.deleteMany({});
    await Investigation.deleteMany({});

    // Register User A
    const resA = await request(app)
      .post('/auth/register')
      .send({ email: 'docuser_a@test.com', password: 'Password123!', name: 'Document Manager A' });
    userA = resA.body.data.user;
    const sessionCookieA = resA.headers['set-cookie'];

    const csrfResA = await request(app).get('/auth/csrf').set('Cookie', sessionCookieA);
    csrfA = csrfResA.body.data.csrfToken;
    const csrfCookieA = csrfResA.headers['set-cookie'];
    cookieA = [sessionCookieA[0], csrfCookieA[0]];

    // Register User B
    const resB = await request(app)
      .post('/auth/register')
      .send({ email: 'docuser_b@test.com', password: 'Password123!', name: 'Document Manager B' });
    const sessionCookieB = resB.headers['set-cookie'];
    const csrfResB = await request(app).get('/auth/csrf').set('Cookie', sessionCookieB);
    const csrfCookieB = csrfResB.headers['set-cookie'];
    cookieB = [sessionCookieB[0], csrfCookieB[0]];

    // Create Project for User A
    const projRes = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({ name: 'Tower Construction Phase 1', projectType: 'commercial_building' });
    projectA = projRes.body.data.project;
  });

  it('BR-D6: sanitizes malicious filenames stripping path traversal and script tags', () => {
    const malicious1 = '../../../../etc/passwd<script>alert("xss")</script>.pdf';
    const sanitized1 = sanitizeFilename(malicious1);
    expect(sanitized1).not.toContain('..');
    expect(sanitized1).not.toContain('<script>');
    expect(sanitized1).not.toContain('/');
    expect(sanitized1).toMatch(/\.pdf$/);

    const malicious2 = '.../windows/system32/cmd.exe';
    const sanitized2 = sanitizeFilename(malicious2);
    expect(sanitized2).not.toMatch(/^\./);
  });

  it('BR-D1: rejects unsupported file extension, invalid MIME, and fake magic bytes', async () => {
    // 1. Wrong extension (.exe)
    const resExe = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_contract')
      .attach('file', Buffer.from('binary-content'), 'exploit.exe');
    expect(resExe.status).toBe(400);
    expect(resExe.body.error.code).toBe('UNSUPPORTED_FILE');

    // 2. Named .pdf but lacking %PDF magic bytes
    const resCorrupt = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_contract')
      .attach('file', Buffer.from('THIS IS NOT A PDF FILE'), 'corrupt.pdf');
    expect(resCorrupt.status).toBe(400);
    expect(resCorrupt.body.error.code).toBe('UNSUPPORTED_FILE');

    // 3. Named .docx but lacking PK\x03\x04 zip header
    const resBadDocx = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_contract')
      .attach('file', Buffer.from('Plain text fake docx'), 'fake.docx');
    expect(resBadDocx.status).toBe(400);
    expect(resBadDocx.body.error.code).toBe('UNSUPPORTED_FILE');
  });

  it('BR-D2: rejects invalid document category', async () => {
    const res = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'arbitrary_unapproved_category')
      .attach('file', validPdfBuffer, 'spec.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/Invalid document category/i);
  });

  it('BR-D3: compensation logic deletes uploaded ImageKit file if DB record creation fails', async () => {
    let deletedFileId = null;

    setImageKitMock({
      upload: async () => ({
        fileId: 'ik_compensate_test_123',
        name: 'spec.pdf',
        filePath: '/scopesentry/projects/test/spec.pdf',
        url: 'https://ik.imagekit.io/mock/spec.pdf'
      }),
      delete: async (fileId) => {
        deletedFileId = fileId;
        return { success: true };
      }
    });

    // Pass simulateDbFailure to trigger DB failure after ImageKit upload
    const res = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_specification')
      .field('simulateDbFailure', 'true')
      .attach('file', validPdfBuffer, 'spec.pdf');

    expect(res.status).toBe(500);
    // Verified: No document was created and compensation hook was called
    expect(deletedFileId).toBe('ik_compensate_test_123');
    expect(await Document.countDocuments({})).toBe(0);
  });

  it('BR-D4 & BR-D8: uploads valid PDF, extracts text, and sets ready status', async () => {
    setTextExtractionMock({
      extract: async () => ({
        text: 'Section 08 51 13: Aluminum Windows. Standard double-glazed frames.',
        pageCount: 3
      })
    });

    const res = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_specification')
      .attach('file', validPdfBuffer, '../../clean_specification.pdf');

    expect(res.status).toBe(201);
    const doc = res.body.data.document;
    expect(doc.originalFilename).toBe('clean_specification.pdf');
    expect(doc.processingStatus).toBe('ready');
    expect(doc.extractedText).toContain('Section 08 51 13');
    expect(doc.pageCount).toBe(3);

    // Verify DB state
    const saved = await Document.findById(doc.id);
    expect(saved).not.toBeNull();
    expect(saved.ownerId.toString()).toBe(userA.id);
    expect(saved.projectId.toString()).toBe(projectA.id);
  });

  it('BR-D1 & BR-D4: uploads valid DOCX, extracts text, and sets ready status', async () => {
    setTextExtractionMock({
      extract: async () => ({
        text: 'Change Request #04: Add insulation to exterior envelope.',
        pageCount: 1
      })
    });

    const res = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'change_request')
      .attach('file', validDocxBuffer, 'change_request_04.docx');

    expect(res.status).toBe(201);
    const doc = res.body.data.document;
    expect(doc.originalFilename).toBe('change_request_04.docx');
    expect(doc.processingStatus).toBe('ready');
    expect(doc.extractedText).toContain('Change Request #04');
  });

  it('BR-D9: scanned PDF with no extractable text sets failed status with reason no_extractable_text', async () => {
    setTextExtractionMock({
      extract: async () => {
        const err = new Error('No extractable text');
        err.code = 'no_extractable_text';
        throw err;
      }
    });

    const res = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'change_request')
      .attach('file', validPdfBuffer, 'scanned_drawing.pdf');

    expect(res.status).toBe(201);
    const doc = res.body.data.document;
    expect(doc.processingStatus).toBe('failed');
    expect(doc.failureReason).toBe('no_extractable_text');
  });

  it('BR-D5: authenticated download route returns signed URL; foreign user access returns 404', async () => {
    const uploadRes = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_contract')
      .attach('file', validPdfBuffer, 'prime_contract.pdf');

    const documentId = uploadRes.body.data.document.id;

    // User A requests download URL -> 200 with signed link
    const downloadResA = await request(app)
      .get(`/documents/${documentId}/download`)
      .set('Cookie', cookieA);
    expect(downloadResA.status).toBe(200);
    expect(downloadResA.body.data.downloadUrl).toBeDefined();

    // User B requests download for User A document -> 404 (BR-D5, foreign id -> 404)
    const downloadResB = await request(app)
      .get(`/documents/${documentId}/download`)
      .set('Cookie', cookieB);
    expect(downloadResB.status).toBe(404);
    expect(downloadResB.body.error.code).toBe('NOT_FOUND');
  });

  it('BR-D7: deleting a document referenced by an investigation is BLOCKED with 409', async () => {
    // Upload document
    const uploadRes = await request(app)
      .post(`/projects/${projectA.id}/documents`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .field('category', 'original_specification')
      .attach('file', validPdfBuffer, 'baseline_spec.pdf');
    const docId = uploadRes.body.data.document.id;

    // Create an investigation referencing this document
    await Investigation.create({
      ownerId: userA.id,
      projectId: projectA.id,
      originalDocumentId: docId,
      revisedDocumentId: docId,
      inputHash: 'hash_ref_test_001',
      status: 'queued'
    });

    // Attempt to delete document -> BLOCKED (409 CONFLICT)
    const deleteRes = await request(app)
      .delete(`/documents/${docId}`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA);

    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.error.code).toBe('CONFLICT');
    expect(deleteRes.body.error.message).toMatch(/referenced by an existing investigation/i);

    // Verify document was NOT deleted
    const docStillExists = await Document.findById(docId);
    expect(docStillExists).not.toBeNull();
  });
});
