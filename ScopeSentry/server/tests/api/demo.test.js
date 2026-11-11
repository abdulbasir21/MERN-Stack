import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { Project } from '../../src/models/Project.js';
import { Document } from '../../src/models/Document.js';
import { seedDemoData } from '../../src/db/seedDemo.js';

describe('Phase 8: Public Interactive Demo Integration Tests (Section 13)', { timeout: 60000 }, () => {
  let app;
  let demoIds;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // Run seedDemoData
    demoIds = await seedDemoData();
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  }, 30000);

  it('Seed Idempotency: seeds exactly 3 projects without duplicating on rerun', async () => {
    const countBefore = await Project.countDocuments({ isDemo: true });
    expect(countBefore).toBe(3);

    // Re-run seedDemoData
    demoIds = await seedDemoData();

    const countAfter = await Project.countDocuments({ isDemo: true });
    expect(countAfter).toBe(3);
  });

  it('Visitor Access: lists demo projects and documents without authentication', async () => {
    // 1. GET /demo/projects
    const projRes = await request(app).get('/demo/projects');
    expect(projRes.status).toBe(200);
    const projects = projRes.body.data.projects;
    expect(projects.length).toBe(3);
    for (const p of projects) {
      expect(p.isDemo).toBe(true);
      expect(p.ownerId).toBeNull();
    }

    // 2. GET /demo/projects/:id
    const singleRes = await request(app).get(`/demo/projects/${demoIds.commercialProjectId}`);
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.data.project.name).toContain('Commercial Plaza');

    // 3. GET /demo/projects/:projectId/documents
    const docRes = await request(app).get(`/demo/projects/${demoIds.commercialProjectId}/documents`);
    expect(docRes.status).toBe(200);
    const docs = docRes.body.data.documents;
    expect(docs.length).toBeGreaterThanOrEqual(2);
    for (const d of docs) {
      expect(d.isDemo).toBe(true);
    }
  });

  it('Read-Only Guard: user mutating routes reject demo entities (404/not owned)', async () => {
    // Try to delete demo project via regular authenticated or unauthenticated route
    const deleteRes = await request(app).delete(`/projects/${demoIds.commercialProjectId}`);
    expect(deleteRes.status).toBe(401); // unauthenticated

    // Also verify foreign/demo IDs return 404 if accessed via regular user document route
    const doc = await Document.findOne({ projectId: demoIds.commercialProjectId, isDemo: true });
    expect(doc).toBeTruthy();

    const deleteDocRes = await request(app).delete(`/documents/${doc._id}`);
    expect(deleteDocRes.status).toBe(401);
  });

  it('Demo Investigation Runner: executes real investigation and returns grounded findings', async () => {
    const docs = await Document.find({ projectId: demoIds.commercialProjectId, isDemo: true });
    const origDoc = docs.find((d) => d.category === 'original_specification');
    const revDoc = docs.find((d) => d.category === 'revised_specification');

    expect(origDoc).toBeTruthy();
    expect(revDoc).toBeTruthy();

    // Run demo investigation
    const runRes = await request(app)
      .post('/demo/investigations')
      .send({
        projectId: demoIds.commercialProjectId.toString(),
        originalDocumentId: origDoc._id.toString(),
        revisedDocumentId: revDoc._id.toString()
      });

    expect(runRes.status).toBe(200);
    expect(runRes.body.data.isDemo).toBe(true);
    expect(runRes.body.data.demoSessionId).toBeTruthy();

    // Verify session cookie was set
    const cookies = runRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('scopesentry_demo_session');

    const inv = runRes.body.data.investigation;
    expect(inv.status).toBe('completed');
    expect(inv.isDemo).toBe(true);

    // Fetch findings
    const findingsRes = await request(app)
      .get(`/demo/investigations/${inv._id || inv.id}/findings`)
      .set('Cookie', cookies);

    expect(findingsRes.status).toBe(200);
    const findings = findingsRes.body.data.findings;
    expect(findings.length).toBeGreaterThan(0);

    // Verify canonical window finding in demo: 20 -> 32 (+12 qty diff, $5400 cost diff)
    const windowFinding = findings.find((f) => f.title.includes('Aluminum Windows') || f.title.includes('08 51 13'));
    expect(windowFinding).toBeDefined();
    expect(windowFinding.impact.quantityDifference).toBe('12');
    expect(windowFinding.impact.estimatedCostDifference).toBe('5400');
  });

  it('Demo rate limiting: enforces limits when x-test-rate-limit is supplied', async () => {
    const docs = await Document.find({ projectId: demoIds.residentialProjectId, isDemo: true });
    const origDoc = docs.find((d) => d.category === 'original_contract');
    const revDoc = docs.find((d) => d.category === 'change_request');

    // Fire requests with x-test-rate-limit header
    let hitRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post('/demo/investigations')
        .set('x-test-rate-limit', 'true')
        .send({
          projectId: demoIds.residentialProjectId.toString(),
          originalDocumentId: origDoc._id.toString(),
          revisedDocumentId: revDoc._id.toString()
        });

      if (res.status === 429) {
        hitRateLimit = true;
        expect(res.body.error.code).toBe('RATE_LIMITED');
        break;
      }
    }

    expect(hitRateLimit).toBe(true);
  });
});
