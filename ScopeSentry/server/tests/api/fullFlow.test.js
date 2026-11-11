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
import { indexDocumentChunks } from '../../src/services/indexingService.js';
import { runInvestigation } from '../../src/services/investigationService.js';

describe('Phase 9: Comprehensive End-to-End Full Flow Integration Test', { timeout: 90000 }, () => {
  let app;
  let user;
  let authCookie;
  let csrfToken;
  let project;
  let origDoc, revDoc;
  let investigation;
  let windowFinding;
  let report;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // Clean up test user
    await User.deleteMany({ email: 'fullflow_contractor@example.com' });
  }, 60000);

  afterAll(async () => {
    const pId = project ? (project.id || project._id) : null;
    if (pId) {
      await DocumentChunk.deleteMany({ projectId: pId });
      await Finding.deleteMany({ projectId: pId });
      await ReviewAction.deleteMany({ projectId: pId });
      await Report.deleteMany({ projectId: pId });
      await Investigation.deleteMany({ projectId: pId });
      await Document.deleteMany({ projectId: pId });
      await Project.deleteMany({ _id: pId });
    }
    await User.deleteMany({ email: 'fullflow_contractor@example.com' });
    await disconnectDatabase();
  }, 30000);

  it('Step 1: Visitor browses demo projects and views public scenarios', async () => {
    const res = await request(app).get('/demo/projects');
    expect(res.status).toBe(200);
    expect(res.body.data.projects.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 2: User registers new account and acquires authenticated session + CSRF token', async () => {
    const regRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'fullflow_contractor@example.com',
        password: 'Password123!Enterprise',
        name: 'Sarah Connor'
      });

    expect(regRes.status).toBe(201);
    user = regRes.body.data.user;
    authCookie = regRes.headers['set-cookie'];

    // Acquire CSRF token
    const csrfRes = await request(app)
      .get('/auth/csrf')
      .set('Cookie', authCookie);

    expect(csrfRes.status).toBe(200);
    csrfToken = csrfRes.body.data.csrfToken;
    const csrfCookie = csrfRes.headers['set-cookie'];
    authCookie = [...authCookie, ...csrfCookie];
  });

  it('Step 3: User creates a new commercial construction project', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Full Flow Commercial Plaza',
        description: 'Multi-story office tower with retail podium',
        projectType: 'commercial_building',
        location: 'Chicago, IL',
        budget: 50000000,
        currency: 'USD',
        startDate: '2026-06-01',
        expectedCompletionDate: '2028-12-31'
      });

    expect(res.status).toBe(201);
    project = res.body.data.project;
    expect(project.name).toBe('Full Flow Commercial Plaza');
    expect(project.ownerId).toBe(user.id);
  });

  it('Step 4: User creates and indexes original & revised specification documents', async () => {
    const projectId = project.id || project._id;

    // 1. Original Document
    origDoc = await Document.create({
      ownerId: user.id,
      projectId,
      category: 'original_specification',
      originalFilename: 'Plaza_Spec_Rev0.pdf',
      storedFileId: 'mock_orig_file',
      storedFilePath: '/mock/Plaza_Spec_Rev0.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 8192,
      processingStatus: 'ready',
      extractedText: 'Section 08 51 13: Install 20 standard windows. Unit price: $450.00 each. Completion date: 2026-06-01.'
    });

    // 2. Revised Document
    revDoc = await Document.create({
      ownerId: user.id,
      projectId,
      category: 'revised_specification',
      originalFilename: 'Plaza_Spec_Rev1.pdf',
      storedFileId: 'mock_rev_file',
      storedFilePath: '/mock/Plaza_Spec_Rev1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 8340,
      processingStatus: 'ready',
      extractedText: 'Section 08 51 13: Install 32 premium insulated windows. Unit price: $450.00 each. Completion date: 2026-06-15.'
    });

    // Index chunks in parallel
    await Promise.all([
      indexDocumentChunks(user.id, projectId, origDoc._id, { text: origDoc.extractedText }),
      indexDocumentChunks(user.id, projectId, revDoc._id, { text: revDoc.extractedText })
    ]);

    const chunkCount = await DocumentChunk.countDocuments({ projectId });
    expect(chunkCount).toBeGreaterThanOrEqual(2);
  });

  it('Step 5: User executes an investigation and retrieves grounded findings', async () => {
    const projectId = project.id || project._id;
    const startRes = await request(app)
      .post(`/projects/${projectId}/investigations`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        originalDocumentId: origDoc._id.toString(),
        revisedDocumentId: revDoc._id.toString()
      });

    expect([200, 202]).toContain(startRes.status);
    const invId = startRes.body.data.investigation.id || startRes.body.data.investigation._id;

    // Run investigation synchronously to completion
    await runInvestigation(invId);

    investigation = await Investigation.findById(invId);
    expect(investigation.status).toBe('completed');

    // Fetch findings
    const findingsRes = await request(app)
      .get(`/investigations/${invId}/findings`)
      .set('Cookie', authCookie);

    expect(findingsRes.status).toBe(200);
    const findings = findingsRes.body.data.findings;
    expect(findings.length).toBeGreaterThan(0);

    windowFinding = findings.find((f) => f.title.includes('08 51 13') || f.title.includes('Aluminum Windows'));
    expect(windowFinding).toBeDefined();
    expect(windowFinding.impact.quantityDifference).toBe('12');
    expect(windowFinding.impact.estimatedCostDifference).toBe('5400');
    expect(windowFinding.reviewStatus).toBe('pending');
  });

  it('Step 6: User reviews finding, approves it, and adds an audit comment', async () => {
    const findingId = windowFinding._id || windowFinding.id;

    // 1. Approve finding
    const reviewRes = await request(app)
      .patch(`/findings/${findingId}/review`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        reviewStatus: 'approved',
        reason: 'Verified against architectural addendum'
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.finding.reviewStatus).toBe('approved');

    // 2. Add comment
    const commentRes = await request(app)
      .post(`/findings/${findingId}/comments`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        comment: 'Contractor requested credit for original units. Under negotiation.'
      });

    expect(commentRes.status).toBe(201);

    // 3. Inspect audit trail history
    const histRes = await request(app)
      .get(`/findings/${findingId}/history`)
      .set('Cookie', authCookie);

    expect(histRes.status).toBe(200);
    const actions = histRes.body.data.history;
    expect(actions.length).toBeGreaterThanOrEqual(2);
  });

  it('Step 7: User overrides unit price and verifies dynamic cost recalculation', async () => {
    const findingId = windowFinding._id || windowFinding.id;

    const overrideRes = await request(app)
      .patch(`/findings/${findingId}/price-override`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        unitPriceOverride: '500.00'
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.finding.impact.activeUnitPrice).toBe('500');
    expect(overrideRes.body.data.finding.impact.unitPriceSource).toBe('override');
    // 12 * 500 = 6000
    expect(overrideRes.body.data.finding.impact.estimatedCostDifference).toBe('6000');
  });

  it('Step 8: User generates executive PDF report and downloads it', async () => {
    const invId = investigation._id || investigation.id;

    const repRes = await request(app)
      .post(`/investigations/${invId}/reports`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken);

    expect(repRes.status).toBe(201);
    report = repRes.body.data.report;
    expect(report.investigationId.toString()).toBe(invId.toString());

    // Test download
    const dlRes = await request(app)
      .get(`/reports/${report.id || report._id}/download`)
      .set('Cookie', authCookie);

    expect(dlRes.status).toBe(200);
    expect(dlRes.body.data.downloadUrl).toBeDefined();
  });

  it('Step 9: User checks live dashboard metrics', async () => {
    const dashRes = await request(app)
      .get('/dashboard')
      .set('Cookie', authCookie);

    expect(dashRes.status).toBe(200);
    const metrics = dashRes.body.data.metrics;
    expect(metrics.totalProjects).toBeGreaterThanOrEqual(1);
    expect(metrics.totalInvestigations).toBeGreaterThanOrEqual(1);
    expect(metrics.reportsGenerated).toBeGreaterThanOrEqual(1);
  });

  it('Step 10: Cascade deletion removes all related records', async () => {
    const projectId = project.id || project._id;
    const delRes = await request(app)
      .delete(`/projects/${projectId}`)
      .set('Cookie', authCookie)
      .set('x-csrf-token', csrfToken);

    expect(delRes.status).toBe(200);

    // Verify database clean up
    const projCheck = await Project.findById(projectId);
    expect(projCheck).toBeNull();

    const docCheck = await Document.countDocuments({ projectId });
    expect(docCheck).toBe(0);

    const chunkCheck = await DocumentChunk.countDocuments({ projectId });
    expect(chunkCheck).toBe(0);

    const invCheck = await Investigation.countDocuments({ projectId });
    expect(invCheck).toBe(0);

    const findCheck = await Finding.countDocuments({ projectId });
    expect(findCheck).toBe(0);

    const repCheck = await Report.countDocuments({ projectId });
    expect(repCheck).toBe(0);
  });
});
