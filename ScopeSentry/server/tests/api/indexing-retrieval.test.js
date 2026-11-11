import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/db/connection.js';
import { User } from '../../src/models/User.js';
import { Project } from '../../src/models/Project.js';
import { Document } from '../../src/models/Document.js';
import { DocumentChunk } from '../../src/models/DocumentChunk.js';
import { indexDocumentChunks } from '../../src/services/indexingService.js';
import { hybridRetrieval } from '../../src/services/retrievalService.js';
import { clearEmbeddingMock } from '../../src/ai/embeddingService.js';

describe('Phase 5b: Indexing & Hybrid Retrieval Integration (BR-C3, BR-C4)', { timeout: 30000 }, () => {
  let app;
  let userA;
  let userB;
  let projectA;
  let projectB;
  let cookieA;
  let csrfA;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  }, 30000);

  beforeEach(async () => {
    clearEmbeddingMock();

    await User.deleteMany({ email: { $in: ['retrieval_a@test.com', 'retrieval_b@test.com'] } });
    await Project.deleteMany({});
    await Document.deleteMany({});
    await DocumentChunk.deleteMany({});

    // Register User A
    const resA = await request(app)
      .post('/auth/register')
      .send({ email: 'retrieval_a@test.com', password: 'Password123!', name: 'Retrieval User A' });
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
      .send({ name: 'Commercial Building A', projectType: 'commercial_building' });
    projectA = projResA.body.data.project;

    // Register User B
    const resB = await request(app)
      .post('/auth/register')
      .send({ email: 'retrieval_b@test.com', password: 'Password123!', name: 'Retrieval User B' });
    userB = resB.body.data.user;
    const sessionCookieB = resB.headers['set-cookie'];
    const csrfResB = await request(app).get('/auth/csrf').set('Cookie', sessionCookieB);
    const csrfB = csrfResB.body.data.csrfToken;
    const csrfCookieB = csrfResB.headers['set-cookie'];
    const cookieB = [sessionCookieB[0], csrfCookieB[0]];

    // Create Project B
    const projResB = await request(app)
      .post('/projects')
      .set('Cookie', cookieB)
      .set('X-CSRF-Token', csrfB)
      .send({ name: 'Commercial Building B', projectType: 'commercial_building' });
    projectB = projResB.body.data.project;
  }, 30000);

  it('BR-C3: re-processing replaces chunks atomically in a transaction', async () => {
    const doc = await Document.create({
      ownerId: userA.id,
      projectId: projectA.id,
      category: 'original_specification',
      originalFilename: 'spec_v1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      processingStatus: 'extracted'
    });

    // Initial indexing with version 1 text
    const textV1 = 'SECTION 08 51 13: Install 20 standard aluminum windows.';
    await indexDocumentChunks(userA.id, projectA.id, doc._id, { text: textV1 });

    const chunksV1 = await DocumentChunk.find({ documentId: doc._id });
    expect(chunksV1.length).toBe(1);
    expect(chunksV1[0].text).toContain('20 standard aluminum windows');

    // Re-process with version 2 revised text
    const textV2 = 'SECTION 08 51 13: Revised to install 32 premium insulated windows.';
    await indexDocumentChunks(userA.id, projectA.id, doc._id, { text: textV2 });

    const chunksV2 = await DocumentChunk.find({ documentId: doc._id });
    // Total chunks must still be 1 (old chunks atomically replaced, not duplicated)
    expect(chunksV2.length).toBe(1);
    expect(chunksV2[0].text).toContain('32 premium insulated windows');
    expect(chunksV2[0].text).not.toContain('20 standard');

    // Document status updated to ready
    const updatedDoc = await Document.findById(doc._id);
    expect(updatedDoc.processingStatus).toBe('ready');
  });

  it('BR-C4: Cross-user isolation: User A retrieval NEVER returns User B chunks even for identical document text', async () => {
    const identicalText = 'SECTION 08 51 13: Furnish and install 32 premium insulated windows with argon gas.';

    // Create identical document and chunks for User A
    const docA = await Document.create({
      ownerId: userA.id,
      projectId: projectA.id,
      category: 'original_specification',
      originalFilename: 'spec_identical.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      processingStatus: 'extracted'
    });
    await indexDocumentChunks(userA.id, projectA.id, docA._id, { text: identicalText });

    // Create identical document and chunks for User B
    const docB = await Document.create({
      ownerId: userB.id,
      projectId: projectB.id,
      category: 'original_specification',
      originalFilename: 'spec_identical.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      processingStatus: 'extracted'
    });
    await indexDocumentChunks(userB.id, projectB.id, docB._id, { text: identicalText });

    // Total chunks in database across all users is 2
    expect(await DocumentChunk.countDocuments({})).toBe(2);

    // User A executes hybrid retrieval
    const resultsUserA = await hybridRetrieval({
      ownerId: userA.id,
      projectId: projectA.id,
      query: '32 premium insulated windows Section 08 51 13'
    });

    expect(resultsUserA.length).toBeGreaterThan(0);
    // Strict isolation assertion: EVERY retrieved chunk belongs strictly to User A and Project A
    for (const chunk of resultsUserA) {
      expect(chunk.ownerId.toString()).toBe(userA.id);
      expect(chunk.projectId.toString()).toBe(projectA.id);
      expect(chunk.ownerId.toString()).not.toBe(userB.id);
      expect(chunk.projectId.toString()).not.toBe(projectB.id);
    }
  });

  it('BR-C4: Retrieval strictly requires project scope and throws if ownerId or projectId is missing', async () => {
    await expect(
      hybridRetrieval({
        ownerId: null,
        projectId: projectA.id,
        query: 'test query'
      })
    ).rejects.toThrow(/requires both ownerId and projectId/i);

    await expect(
      hybridRetrieval({
        ownerId: userA.id,
        projectId: null,
        query: 'test query'
      })
    ).rejects.toThrow(/requires both ownerId and projectId/i);
  });

  it('Hybrid Retrieval: finds exact keyword matches (e.g. Section 08 51 13, 32 windows)', async () => {
    const doc = await Document.create({
      ownerId: userA.id,
      projectId: projectA.id,
      category: 'revised_specification',
      originalFilename: 'revised_spec.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      processingStatus: 'extracted'
    });

    const chunk1 = 'General project notes on safety and scaffolding equipment.';
    const chunk2 = 'Section 08 51 13: Contractor shall deliver 32 windows by milestone date.';

    await DocumentChunk.create([
      {
        ownerId: userA.id,
        projectId: projectA.id,
        documentId: doc._id,
        documentCategory: 'revised_specification',
        chunkIndex: 0,
        text: chunk1,
        embedding: new Array(768).fill(0.01)
      },
      {
        ownerId: userA.id,
        projectId: projectA.id,
        documentId: doc._id,
        documentCategory: 'revised_specification',
        chunkIndex: 1,
        text: chunk2,
        embedding: new Array(768).fill(0.02)
      }
    ]);

    const results = await hybridRetrieval({
      ownerId: userA.id,
      projectId: projectA.id,
      query: 'Section 08 51 13 32 windows'
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].text).toContain('Section 08 51 13');
    expect(results[0].text).toContain('32 windows');
  });
});
