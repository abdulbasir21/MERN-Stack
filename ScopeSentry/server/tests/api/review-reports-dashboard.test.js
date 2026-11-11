import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { User } from '../../src/models/User.js';
import { Project } from '../../src/models/Project.js';
import { Document } from '../../src/models/Document.js';
import { Investigation } from '../../src/models/Investigation.js';
import { Finding } from '../../src/models/Finding.js';
import { ReviewAction } from '../../src/models/ReviewAction.js';
import { Report } from '../../src/models/Report.js';

describe('Phase 7: Findings Review, Reports & Dashboard Integration (BR-R1 to BR-R5, BR-RP1 to BR-RP5)', { timeout: 35000 }, () => {
  let app;
  let userA;
  let projectA;
  let cookieA;
  let csrfA;
  let cookieB;
  let csrfB;
  let investigationA;
  let findingA;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    await User.deleteMany({ email: { $in: ['rev_user_a@test.com', 'rev_user_b@test.com'] } });
    await Project.deleteMany({});

    // Register User A
    const resA = await request(app)
      .post('/auth/register')
      .send({ email: 'rev_user_a@test.com', password: 'Password123!', name: 'Review User A' });
    userA = resA.body.data.user;
    const sessionCookieA = resA.headers['set-cookie'];
    const csrfResA = await request(app).get('/auth/csrf').set('Cookie', sessionCookieA);
    csrfA = csrfResA.body.data.csrfToken;
    const csrfCookieA = csrfResA.headers['set-cookie'];
    cookieA = [sessionCookieA[0], csrfCookieA[0]];

    // Create Project A
    const projResA = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({ name: 'Commercial Tower Phase 7', projectType: 'commercial_building' });
    projectA = projResA.body.data.project;

    // Register User B (Foreign user)
    const resB = await request(app)
      .post('/auth/register')
      .send({ email: 'rev_user_b@test.com', password: 'Password123!', name: 'Review User B' });
    const sessionCookieB = resB.headers['set-cookie'];
    const csrfResB = await request(app).get('/auth/csrf').set('Cookie', sessionCookieB);
    csrfB = csrfResB.body.data.csrfToken;
    const csrfCookieB = csrfResB.headers['set-cookie'];
    cookieB = [sessionCookieB[0], csrfCookieB[0]];
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  }, 30000);

  beforeEach(async () => {
    await Document.deleteMany({});
    await Investigation.deleteMany({});
    await Finding.deleteMany({});
    await ReviewAction.deleteMany({});
    await Report.deleteMany({});

    // Create completed Investigation for User A
    investigationA = await Investigation.create({
      ownerId: userA.id,
      projectId: projectA.id,
      originalDocumentId: '507f1f77bcf86cd799439011',
      revisedDocumentId: '507f1f77bcf86cd799439012',
      inputHash: 'test_hash_p7',
      status: 'completed',
      startedAt: new Date(Date.now() - 60000),
      finishedAt: new Date()
    });

    // Create Finding with initial pending status
    findingA = await Finding.create({
      investigationId: investigationA._id,
      ownerId: userA.id,
      projectId: projectA.id,
      title: 'Section 08 51 13 - Aluminum Windows Upgrade',
      category: 'quantity_changed',
      originalValue: '20',
      revisedValue: '32',
      unit: 'units',
      extractedUnitPrice: 450.00,
      unitPriceOverride: null,
      description: 'Window quantity increased from 20 to 32 units.',
      evidence: [
        {
          snippet: 'Install 20 standard windows',
          page: 5
        }
      ],
      approvalEvidence: {
        status: 'not_found',
        evidence: []
      },
      confidence: 'high',
      uncertaintyNote: 'Confirmed from matching clause identifiers.',
      reviewStatus: 'pending'
    });
  }, 30000);

  describe('7a: Findings Review & Audit Trail (BR-R1 to BR-R5)', () => {
    it('BR-R1: defaults to pending; rejects invalid review status', async () => {
      expect(findingA.reviewStatus).toBe('pending');

      const res = await request(app)
        .patch(`/findings/${findingA._id}/review`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({ reviewStatus: 'legally_binding_acceptance' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid review status');
    });

    it('BR-R2: review status transition writes exactly one audit record in same transaction', async () => {
      const res = await request(app)
        .patch(`/findings/${findingA._id}/review`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({
          reviewStatus: 'approved',
          comment: 'Approved by PM after verifying field measurements.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.finding.reviewStatus).toBe('approved');

      // Verify audit record was created
      const audits = await ReviewAction.find({ findingId: findingA._id });
      expect(audits).toHaveLength(1);
      expect(audits[0].type).toBe('status_change');
      expect(audits[0].fromStatus).toBe('pending');
      expect(audits[0].toStatus).toBe('approved');
      expect(audits[0].comment).toContain('field measurements');
    });

    it('BR-R3: comment length validation and history retrieval', async () => {
      // 1. Empty comment -> 400
      const resEmpty = await request(app)
        .post(`/findings/${findingA._id}/comments`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({ comment: '' });
      expect(resEmpty.status).toBe(400);

      // 2. Oversized comment (>2000 chars) -> 400
      const resLong = await request(app)
        .post(`/findings/${findingA._id}/comments`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({ comment: 'A'.repeat(2001) });
      expect(resLong.status).toBe(400);

      // 3. Valid comment -> 201
      const resValid = await request(app)
        .post(`/findings/${findingA._id}/comments`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({ comment: 'Subcontractor confirmed delivery schedule for windows.' });
      expect(resValid.status).toBe(201);

      // 4. Retrieve history
      const historyRes = await request(app)
        .get(`/findings/${findingA._id}/history`)
        .set('Cookie', cookieA);
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it('BR-R5: unit price override recomputes estimate on read and rejects negative values', async () => {
      // 1. Negative price override -> 400
      const resNeg = await request(app)
        .patch(`/findings/${findingA._id}/price-override`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({ unitPriceOverride: -50 });
      expect(resNeg.status).toBe(400);

      // 2. Valid price override: change from $450 to $500
      const res = await request(app)
        .patch(`/findings/${findingA._id}/price-override`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({
          unitPriceOverride: 500,
          comment: 'Overridden based on subcontractor quote revision.'
        });

      expect(res.status).toBe(200);
      const finding = res.body.data.finding;
      expect(finding.unitPriceOverride).toBe(500);
      expect(finding.impact.activeUnitPrice).toBe('500');
      expect(finding.impact.unitPriceSource).toBe('override');
      // Recalculated dynamically: 12 qty diff * $500 = $6000
      expect(finding.impact.estimatedCostDifference).toBe('6000');

      // Verify audit entry created
      const audit = await ReviewAction.findOne({ findingId: findingA._id, type: 'price_override' });
      expect(audit).toBeTruthy();
    });

    it('Security: foreign user access returns 404', async () => {
      const res = await request(app)
        .patch(`/findings/${findingA._id}/review`)
        .set('Cookie', cookieB)
        .set('X-CSRF-Token', csrfB)
        .send({ reviewStatus: 'approved' });
      expect(res.status).toBe(404);
    });
  });

  describe('7b: Reports & Dashboard (BR-RP1 to BR-RP5, Section 9)', () => {
    it('BR-RP1: generating a report on non-completed investigation returns 400', async () => {
      const runningInv = await Investigation.create({
        ownerId: userA.id,
        projectId: projectA.id,
        originalDocumentId: '507f1f77bcf86cd799439011',
        revisedDocumentId: '507f1f77bcf86cd799439012',
        inputHash: 'running_hash_p7',
        status: 'running'
      });

      const res = await request(app)
        .post(`/investigations/${runningInv._id}/reports`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('completed investigation');
    });

    it('BR-RP2, BR-RP3, BR-RP4: generates 12-section PDF report and stores record', async () => {
      const res = await request(app)
        .post(`/investigations/${investigationA._id}/reports`)
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA);

      expect(res.status).toBe(201);
      const report = res.body.data.report;
      expect(report.id || report._id).toBeTruthy();
      expect(report.filename).toContain('.pdf');

      // Verify report was persisted in database
      const count = await Report.countDocuments({ investigationId: investigationA._id });
      expect(count).toBe(1);

      // Authenticated download route returns signed URL (BR-RP4)
      const reportId = report.id || report._id;
      const downloadRes = await request(app)
        .get(`/reports/${reportId}/download`)
        .set('Cookie', cookieA);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.body.data.downloadUrl).toBeTruthy();

      // Foreign user download -> 404
      const foreignDownload = await request(app)
        .get(`/reports/${reportId}/download`)
        .set('Cookie', cookieB);
      expect(foreignDownload.status).toBe(404);
    });

    it('Dashboard: calculates live metrics without storing derived counts (Section 9)', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.metrics.totalProjects).toBeGreaterThanOrEqual(1);
      expect(data.metrics.activeProjects).toBeGreaterThanOrEqual(1);
      expect(data.metrics.totalInvestigations).toBeGreaterThanOrEqual(1);
      expect(data.metrics.changesAwaitingReview).toBeGreaterThanOrEqual(1); // findingA is pending
      expect(Array.isArray(data.recentProjects)).toBe(true);
      expect(Array.isArray(data.recentInvestigations)).toBe(true);
    });
  });
});
