import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { User } from '../../src/models/User.js';
import { Project } from '../../src/models/Project.js';
import { Document } from '../../src/models/Document.js';
import { DocumentChunk } from '../../src/models/DocumentChunk.js';
import { Investigation } from '../../src/models/Investigation.js';
import { Finding } from '../../src/models/Finding.js';
import { Report } from '../../src/models/Report.js';
import { ReviewAction } from '../../src/models/ReviewAction.js';

describe('Phase 9: Authorization Matrix & Route-by-Route Security Audit', { timeout: 60000 }, () => {
  let app;
  let userA;
  let authCookieA, authCookieB;
  let csrfTokenA, csrfTokenB;
  let projectA;
  let origDocA, revDocA;
  let investigationA;
  let findingA;
  let reportA;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // 1. Clean collections
    await User.deleteMany({ email: { $in: ['matrix_a@example.com', 'matrix_b@example.com'] } });
    await Project.deleteMany({ name: /Matrix Test/ });

    // 2. Register User A
    const regResA = await request(app)
      .post('/auth/register')
      .send({
        email: 'matrix_a@example.com',
        password: 'Password123!Safe',
        name: 'User A Matrix'
      });
    userA = regResA.body.data.user;
    authCookieA = regResA.headers['set-cookie'];

    // Get CSRF Token for User A
    const csrfResA = await request(app)
      .get('/auth/csrf')
      .set('Cookie', authCookieA);
    csrfTokenA = csrfResA.body.data.csrfToken;
    const csrfCookieA = csrfResA.headers['set-cookie'];
    authCookieA = [...authCookieA, ...csrfCookieA];

    // 3. Register User B
    const regResB = await request(app)
      .post('/auth/register')
      .send({
        email: 'matrix_b@example.com',
        password: 'Password123!Safe',
        name: 'User B Matrix'
      });
    authCookieB = regResB.headers['set-cookie'];

    // Get CSRF Token for User B
    const csrfResB = await request(app)
      .get('/auth/csrf')
      .set('Cookie', authCookieB);
    csrfTokenB = csrfResB.body.data.csrfToken;
    const csrfCookieB = csrfResB.headers['set-cookie'];
    authCookieB = [...authCookieB, ...csrfCookieB];

    // 4. Create Project for User A
    projectA = await Project.create({
      ownerId: userA.id,
      name: 'Matrix Test Project A',
      projectType: 'commercial_building',
      budget: 1000000,
      currency: 'USD',
      startDate: '2026-01-01',
      expectedCompletionDate: '2026-12-31'
    });

    // 5. Create Documents for User A
    origDocA = await Document.create({
      ownerId: userA.id,
      projectId: projectA._id,
      category: 'original_specification',
      originalFilename: 'orig_a.pdf',
      storedFileId: 'ik_orig_a',
      storedFilePath: '/test/orig_a.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      processingStatus: 'ready',
      extractedText: 'Section 08 51 13 Aluminum Windows: 20 units at $450 each.'
    });

    revDocA = await Document.create({
      ownerId: userA.id,
      projectId: projectA._id,
      category: 'revised_specification',
      originalFilename: 'rev_a.pdf',
      storedFileId: 'ik_rev_a',
      storedFilePath: '/test/rev_a.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      processingStatus: 'ready',
      extractedText: 'Section 08 51 13 Aluminum Windows: 32 units at $450 each.'
    });

    // 6. Create Investigation for User A
    investigationA = await Investigation.create({
      ownerId: userA.id,
      projectId: projectA._id,
      originalDocumentId: origDocA._id,
      revisedDocumentId: revDocA._id,
      supportingDocumentIds: [],
      inputHash: 'matrix_hash_a_12345',
      status: 'completed',
      startedAt: new Date(),
      finishedAt: new Date()
    });

    // 7. Create Finding for User A
    findingA = await Finding.create({
      ownerId: userA.id,
      projectId: projectA._id,
      investigationId: investigationA._id,
      title: 'Section 08 51 13 - Aluminum Windows Quantity Increase',
      category: 'quantity_changed',
      confidence: 'high',
      uncertaintyNote: 'Deterministic match on CSI clause 08 51 13',
      approvalStatus: 'not_found',
      approvalEvidenceSnippet: null,
      impact: {
        originalQuantity: '20',
        revisedQuantity: '32',
        quantityDifference: '12',
        originalUnitPrice: '450',
        revisedUnitPrice: '450',
        unitPriceDifference: '0',
        unitPriceUsed: '450',
        unitPriceSource: 'extracted',
        estimatedCostDifference: '5400',
        currency: 'USD',
        unitOfMeasure: 'units'
      },
      evidence: [
        {
          documentId: origDocA._id,
          filename: origDocA.originalFilename,
          pageNumber: 1,
          sectionNumber: '08 51 13',
          snippet: '20 units at $450 each'
        }
      ]
    });

    // 8. Create Report for User A
    reportA = await Report.create({
      ownerId: userA.id,
      projectId: projectA._id,
      investigationId: investigationA._id,
      storedFileId: 'ik_rep_a',
      storedFilePath: '/test/report_a.pdf',
      filename: 'Matrix_Report_A.pdf',
      sizeBytes: 25000,
      mimeType: 'application/pdf',
      sectionsIncluded: 12
    });
  }, 60000);

  afterAll(async () => {
    if (projectA) {
      await DocumentChunk.deleteMany({ projectId: projectA._id });
      await Finding.deleteMany({ projectId: projectA._id });
      await ReviewAction.deleteMany({ projectId: projectA._id });
      await Report.deleteMany({ projectId: projectA._id });
      await Investigation.deleteMany({ projectId: projectA._id });
      await Document.deleteMany({ projectId: projectA._id });
      await Project.deleteMany({ _id: projectA._id });
    }
    await User.deleteMany({ email: { $in: ['matrix_a@example.com', 'matrix_b@example.com'] } });
    await disconnectDatabase();
  }, 30000);

  describe('1. Visitor (Unauthenticated) Access Matrix', () => {
    it('rejects /auth/me with 401', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects /projects routes with 401', async () => {
      const getList = await request(app).get('/projects');
      expect(getList.status).toBe(401);

      const getOne = await request(app).get(`/projects/${projectA._id}`);
      expect(getOne.status).toBe(401);

      const post = await request(app).post('/projects').send({ name: 'Hack' });
      expect(post.status).toBe(401);

      const patch = await request(app).patch(`/projects/${projectA._id}`).send({ name: 'Hack' });
      expect(patch.status).toBe(401);

      const del = await request(app).delete(`/projects/${projectA._id}`);
      expect(del.status).toBe(401);
    });

    it('rejects /documents routes with 401', async () => {
      const getDocs = await request(app).get(`/projects/${projectA._id}/documents`);
      expect(getDocs.status).toBe(401);

      const getDoc = await request(app).get(`/documents/${origDocA._id}`);
      expect(getDoc.status).toBe(401);

      const download = await request(app).get(`/documents/${origDocA._id}/download`);
      expect(download.status).toBe(401);

      const del = await request(app).delete(`/documents/${origDocA._id}`);
      expect(del.status).toBe(401);
    });

    it('rejects /investigations routes with 401', async () => {
      const list = await request(app).get(`/projects/${projectA._id}/investigations`);
      expect(list.status).toBe(401);

      const single = await request(app).get(`/investigations/${investigationA._id}`);
      expect(single.status).toBe(401);

      const findings = await request(app).get(`/investigations/${investigationA._id}/findings`);
      expect(findings.status).toBe(401);

      const create = await request(app).post(`/projects/${projectA._id}/investigations`).send({});
      expect(create.status).toBe(401);
    });

    it('rejects /findings routes with 401', async () => {
      const review = await request(app).patch(`/findings/${findingA._id}/review`).send({ reviewStatus: 'approved' });
      expect(review.status).toBe(401);

      const comment = await request(app).post(`/findings/${findingA._id}/comments`).send({ comment: 'test' });
      expect(comment.status).toBe(401);

      const override = await request(app).patch(`/findings/${findingA._id}/price-override`).send({ unitPriceOverride: '500' });
      expect(override.status).toBe(401);

      const history = await request(app).get(`/findings/${findingA._id}/history`);
      expect(history.status).toBe(401);
    });

    it('rejects /reports routes with 401', async () => {
      const createReport = await request(app).post(`/investigations/${investigationA._id}/reports`);
      expect(createReport.status).toBe(401);

      const downloadReport = await request(app).get(`/reports/${reportA._id}/download`);
      expect(downloadReport.status).toBe(401);

      const listReports = await request(app).get(`/projects/${projectA._id}/reports`);
      expect(listReports.status).toBe(401);
    });

    it('rejects /dashboard with 401', async () => {
      const dash = await request(app).get('/dashboard');
      expect(dash.status).toBe(401);
    });

    it('allows public demo endpoints for visitors (200 OK)', async () => {
      const demoProj = await request(app).get('/demo/projects');
      expect(demoProj.status).toBe(200);
    });
  });

  describe('2. User B (Wrong User / Attacker) Cross-Tenant Isolation Matrix', () => {
    it('returns 404 for User A project endpoints accessed by User B', async () => {
      const getRes = await request(app)
        .get(`/projects/${projectA._id}`)
        .set('Cookie', authCookieB);
      expect(getRes.status).toBe(404);

      const patchRes = await request(app)
        .patch(`/projects/${projectA._id}`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB)
        .send({ name: 'Hacked Project Name' });
      expect(patchRes.status).toBe(404);

      const delRes = await request(app)
        .delete(`/projects/${projectA._id}`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB);
      expect(delRes.status).toBe(404);
    });

    it('returns 404 for User A document endpoints accessed by User B', async () => {
      const listDocs = await request(app)
        .get(`/projects/${projectA._id}/documents`)
        .set('Cookie', authCookieB);
      expect(listDocs.status).toBe(404);

      const getDoc = await request(app)
        .get(`/documents/${origDocA._id}`)
        .set('Cookie', authCookieB);
      expect(getDoc.status).toBe(404);

      const download = await request(app)
        .get(`/documents/${origDocA._id}/download`)
        .set('Cookie', authCookieB);
      expect(download.status).toBe(404);

      const delDoc = await request(app)
        .delete(`/documents/${origDocA._id}`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB);
      expect(delDoc.status).toBe(404);
    });

    it('returns 404 for User A investigation endpoints accessed by User B', async () => {
      const listInv = await request(app)
        .get(`/projects/${projectA._id}/investigations`)
        .set('Cookie', authCookieB);
      expect(listInv.status).toBe(404);

      const getInv = await request(app)
        .get(`/investigations/${investigationA._id}`)
        .set('Cookie', authCookieB);
      expect(getInv.status).toBe(404);

      const getFindings = await request(app)
        .get(`/investigations/${investigationA._id}/findings`)
        .set('Cookie', authCookieB);
      expect(getFindings.status).toBe(404);

      const postInv = await request(app)
        .post(`/projects/${projectA._id}/investigations`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB)
        .send({
          originalDocumentId: origDocA._id,
          revisedDocumentId: revDocA._id
        });
      expect(postInv.status).toBe(404);
    });

    it('returns 404 for User A findings actions accessed by User B', async () => {
      const review = await request(app)
        .patch(`/findings/${findingA._id}/review`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB)
        .send({ reviewStatus: 'approved' });
      expect(review.status).toBe(404);

      const comment = await request(app)
        .post(`/findings/${findingA._id}/comments`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB)
        .send({ comment: 'Hacker comment' });
      expect(comment.status).toBe(404);

      const override = await request(app)
        .patch(`/findings/${findingA._id}/price-override`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB)
        .send({ unitPriceOverride: '99999' });
      expect(override.status).toBe(404);

      const history = await request(app)
        .get(`/findings/${findingA._id}/history`)
        .set('Cookie', authCookieB);
      expect(history.status).toBe(404);
    });

    it('returns 404 for User A reports actions accessed by User B', async () => {
      const genReport = await request(app)
        .post(`/investigations/${investigationA._id}/reports`)
        .set('Cookie', authCookieB)
        .set('x-csrf-token', csrfTokenB);
      expect(genReport.status).toBe(404);

      const dlReport = await request(app)
        .get(`/reports/${reportA._id}/download`)
        .set('Cookie', authCookieB);
      expect(dlReport.status).toBe(404);

      const listProjReports = await request(app)
        .get(`/projects/${projectA._id}/reports`)
        .set('Cookie', authCookieB);
      expect(listProjReports.status).toBe(404);
    });
  });

  describe('3. CSRF Protection Matrix on State-Changing Routes', () => {
    it('rejects POST /projects without CSRF token (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/projects')
        .set('Cookie', authCookieA)
        .send({ name: 'CSRF Test', projectType: 'commercial_building', budget: 100 });
      expect(res.status).toBe(403);
    });

    it('rejects PATCH /projects/:id without CSRF token (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/projects/${projectA._id}`)
        .set('Cookie', authCookieA)
        .send({ name: 'CSRF Test' });
      expect(res.status).toBe(403);
    });

    it('rejects PATCH /findings/:id/review without CSRF token (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/findings/${findingA._id}/review`)
        .set('Cookie', authCookieA)
        .send({ reviewStatus: 'approved' });
      expect(res.status).toBe(403);
    });

    it('accepts state-changing requests when valid CSRF token is supplied', async () => {
      const res = await request(app)
        .patch(`/projects/${projectA._id}`)
        .set('Cookie', authCookieA)
        .set('x-csrf-token', csrfTokenA)
        .send({ name: 'Matrix Test Project A - Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.project.name).toBe('Matrix Test Project A - Updated');
    });
  });
});
