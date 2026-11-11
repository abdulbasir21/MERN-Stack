import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { User } from '../../src/models/User.js';
import { Project } from '../../src/models/Project.js';
import { Document } from '../../src/models/Document.js';
import { DocumentChunk } from '../../src/models/DocumentChunk.js';
import { Investigation } from '../../src/models/Investigation.js';
import { Finding } from '../../src/models/Finding.js';
import { ReviewAction } from '../../src/models/ReviewAction.js';
import { Report } from '../../src/models/Report.js';

describe('Phase 3: Projects Module (BR-P1 to BR-P7)', () => {
  let app;
  let userA;
  let cookieA;
  let cookieB;
  let csrfA;
  let csrfB;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean collections
    await User.deleteMany({ email: { $in: ['usera@test.com', 'userb@test.com'] } });
    await Project.deleteMany({});
    await Document.deleteMany({});
    await DocumentChunk.deleteMany({});
    await Investigation.deleteMany({});
    await Finding.deleteMany({});
    await ReviewAction.deleteMany({});
    await Report.deleteMany({});

    // Register User A
    const resA = await request(app)
      .post('/auth/register')
      .send({
        email: 'usera@test.com',
        password: 'Password123!',
        name: 'Executive User A'
      });
    userA = resA.body.data.user;
    const sessionCookieA = resA.headers['set-cookie'];

    const csrfResA = await request(app)
      .get('/auth/csrf')
      .set('Cookie', sessionCookieA);
    csrfA = csrfResA.body.data.csrfToken;
    const csrfCookieA = csrfResA.headers['set-cookie'];
    cookieA = [sessionCookieA[0], csrfCookieA[0]];

    // Register User B
    const resB = await request(app)
      .post('/auth/register')
      .send({
        email: 'userb@test.com',
        password: 'Password123!',
        name: 'Executive User B'
      });
    const sessionCookieB = resB.headers['set-cookie'];

    const csrfResB = await request(app)
      .get('/auth/csrf')
      .set('Cookie', sessionCookieB);
    csrfB = csrfResB.body.data.csrfToken;
    const csrfCookieB = csrfResB.headers['set-cookie'];
    cookieB = [sessionCookieB[0], csrfCookieB[0]];
  });

  it('unauthenticated access to project routes returns 401', async () => {
    const resList = await request(app).get('/projects');
    expect(resList.status).toBe(401);
    expect(resList.body.error.code).toBe('UNAUTHENTICATED');

    const resCreate = await request(app)
      .post('/projects')
      .send({ name: 'Secret Project', projectType: 'commercial_building' });
    expect(resCreate.status).toBe(401);
  });

  it('mutating project requests without CSRF return 403', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .send({
        name: 'Project No CSRF',
        projectType: 'commercial_building'
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('BR-P1 & BR-P3: validates project field limits and rejects invalid projectType', async () => {
    // Missing required name
    const missingName = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({ projectType: 'commercial_building' });
    expect(missingName.status).toBe(400);

    // Invalid projectType
    const invalidType = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({ name: 'Valid Name', projectType: 'skyline_tower' });
    expect(invalidType.status).toBe(400);

    // Negative budget rejected
    const negativeBudget = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Valid Name',
        projectType: 'commercial_building',
        budget: -50000
      });
    expect(negativeBudget.status).toBe(400);
  });

  it('BR-P2: rejects expectedCompletionDate earlier than startDate', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Hospitality Center',
        projectType: 'commercial_building',
        startDate: '2026-06-01',
        expectedCompletionDate: '2026-05-15' // Prior to start date
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/completion date must be on or after start date/i);
  });

  it('BR-P7: sets default currency USD and allows valid 3-letter currency codes', async () => {
    const resDefault = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Civic Tower',
        projectType: 'commercial_building'
      });
    expect(resDefault.status).toBe(201);
    expect(resDefault.body.data.project.currency).toBe('USD');
    expect(resDefault.body.data.project.status).toBe('active');

    // Valid EUR currency code
    const resEur = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Berlin Logistics Park',
        projectType: 'commercial_building',
        currency: 'EUR'
      });
    expect(resEur.status).toBe(201);
    expect(resEur.body.data.project.currency).toBe('EUR');

    // Invalid currency length (4 letters)
    const resInvalid = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Invalid Currency Hub',
        projectType: 'commercial_building',
        currency: 'EURO'
      });
    expect(resInvalid.status).toBe(400);
  });

  it('BR-P4: User B cannot read, update, or delete User A project (returns 404)', async () => {
    // User A creates project
    const createRes = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Project Alpha Private',
        projectType: 'commercial_building',
        location: 'Sector 4'
      });
    const projectId = createRes.body.data.project.id;

    // User B tries to read User A's project -> 404
    const getResB = await request(app)
      .get(`/projects/${projectId}`)
      .set('Cookie', cookieB);
    expect(getResB.status).toBe(404);
    expect(getResB.body.error.code).toBe('NOT_FOUND');

    // User B tries to update User A's project -> 404
    const patchResB = await request(app)
      .patch(`/projects/${projectId}`)
      .set('Cookie', cookieB)
      .set('X-CSRF-Token', csrfB)
      .send({ name: 'Tampered Name' });
    expect(patchResB.status).toBe(404);

    // User B tries to delete User A's project -> 404
    const deleteResB = await request(app)
      .delete(`/projects/${projectId}`)
      .set('Cookie', cookieB)
      .set('X-CSRF-Token', csrfB);
    expect(deleteResB.status).toBe(404);

    // User A lists projects -> sees Project Alpha; User B lists -> does NOT see it
    const listA = await request(app).get('/projects').set('Cookie', cookieA);
    expect(listA.body.data.projects.some((p) => p.id === projectId)).toBe(true);

    const listB = await request(app).get('/projects').set('Cookie', cookieB);
    expect(listB.body.data.projects.some((p) => p.id === projectId)).toBe(false);
  });

  it('BR-P6: Archived project rejects edits with 409 but allows unarchiving and deletion', async () => {
    const createRes = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Metropolis Renovation',
        projectType: 'office_renovation'
      });
    const projectId = createRes.body.data.project.id;

    // Archive project
    const archiveRes = await request(app)
      .post(`/projects/${projectId}/archive`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.project.status).toBe('archived');

    // Attempting to edit fields on archived project -> 409
    const editRes = await request(app)
      .patch(`/projects/${projectId}`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({ name: 'Should Not Update' });
    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe('CONFLICT');

    // Unarchive project -> 200
    const unarchiveRes = await request(app)
      .post(`/projects/${projectId}/unarchive`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA);
    expect(unarchiveRes.status).toBe(200);
    expect(unarchiveRes.body.data.project.status).toBe('active');

    // Now edit is permitted
    const editAfterUnarchive = await request(app)
      .patch(`/projects/${projectId}`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({ name: 'Metropolis Renovation Phase 2' });
    expect(editAfterUnarchive.status).toBe(200);
    expect(editAfterUnarchive.body.data.project.name).toBe('Metropolis Renovation Phase 2');
  });

  it('BR-P5: cascade deletes all child records in one database transaction', async () => {
    // Create Project
    const createRes = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Cascade Test Project',
        projectType: 'commercial_building'
      });
    const projectId = createRes.body.data.project.id;

    // Create child records across all 6 collections
    const doc = await Document.create({
      ownerId: userA.id,
      projectId,
      category: 'original_specification',
      originalFilename: 'spec_v1.pdf',
      storedFileId: 'imgkit_file_999',
      mimeType: 'application/pdf',
      sizeBytes: 2048
    });

    await DocumentChunk.create({
      ownerId: userA.id,
      projectId,
      documentId: doc._id,
      documentCategory: 'original_specification',
      chunkIndex: 0,
      text: 'Section 08 51 13 Aluminum Windows'
    });

    const inv = await Investigation.create({
      ownerId: userA.id,
      projectId,
      originalDocumentId: doc._id,
      revisedDocumentId: doc._id,
      inputHash: 'hash_cascade_test_1',
      status: 'completed'
    });

    const finding = await Finding.create({
      investigationId: inv._id,
      ownerId: userA.id,
      projectId,
      title: 'Window Spec Change',
      category: 'material_changed',
      confidence: 'high',
      reviewStatus: 'pending'
    });

    await ReviewAction.create({
      findingId: finding._id,
      investigationId: inv._id,
      ownerId: userA.id,
      type: 'comment',
      comment: 'Initial audit observation'
    });

    await Report.create({
      investigationId: inv._id,
      ownerId: userA.id,
      projectId,
      storedFileId: 'report_file_888',
      filename: 'Change_Report.pdf'
    });

    // Delete project
    const delRes = await request(app)
      .delete(`/projects/${projectId}`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.filesMarkedForCleanup).toContain('imgkit_file_999');

    // Verify all child records were deleted
    expect(await Project.findById(projectId)).toBeNull();
    expect(await Document.find({ projectId })).toHaveLength(0);
    expect(await DocumentChunk.find({ projectId })).toHaveLength(0);
    expect(await Investigation.find({ projectId })).toHaveLength(0);
    expect(await Finding.find({ projectId })).toHaveLength(0);
    expect(await ReviewAction.find({ investigationId: inv._id })).toHaveLength(0);
    expect(await Report.find({ projectId })).toHaveLength(0);
  });

  it('BR-P5 Transactional Rollback: forced failure during cascade delete preserves all records', async () => {
    // Create Project
    const createRes = await request(app)
      .post('/projects')
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA)
      .send({
        name: 'Rollback Test Project',
        projectType: 'commercial_building'
      });
    const projectId = createRes.body.data.project.id;

    await Document.create({
      ownerId: userA.id,
      projectId,
      category: 'original_specification',
      originalFilename: 'spec_rollback.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024
    });

    // Request deletion with simulateFailure query parameter to force mid-transaction error
    const failRes = await request(app)
      .delete(`/projects/${projectId}?simulateFailure=true`)
      .set('Cookie', cookieA)
      .set('X-CSRF-Token', csrfA);
    expect(failRes.status).toBe(500);

    // Verify atomic rollback: both project and document still exist
    const projectAfter = await Project.findById(projectId);
    expect(projectAfter).not.toBeNull();
    const docAfter = await Document.find({ projectId });
    expect(docAfter).toHaveLength(1);
  });
});
