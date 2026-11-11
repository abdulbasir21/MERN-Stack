import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { seedDatabase } from '../../prisma/seed.js';
import {
  chunkText,
  validateStartupEmbeddingConfig,
  validateEmbeddingDimensions,
} from '../../src/lib/chunking.js';
import {
  indexDocumentChunks,
  retrieveRelevantChunks,
  validateDocumentsReady,
} from '../../src/services/rag/ragService.js';
import {
  MockEmbeddingGenerator,
  setEmbeddingGenerator,
  resetEmbeddingGenerator,
} from '../../src/services/rag/embeddingService.js';
import {
  RAG_TOP_K,
  RAG_MAX_TOTAL_CHARS,
  EMBEDDING_DIMENSIONS,
} from '../../src/config/constants.js';

describe('Phase 5 (b) — RAG Database, Vector Search, and Cross-User Isolation (RAG-1 to RAG-8, QTA-1)', () => {
  const mockEmbeddingGen = new MockEmbeddingGenerator();

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  });

  beforeEach(async () => {
    setEmbeddingGenerator(mockEmbeddingGen);
    mockEmbeddingGen.callCount = 0;

    await prisma.$transaction([
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
    resetEmbeddingGenerator();
  });

  it('RAG-1: chunking is deterministic pure function — same text produces identical chunks', () => {
    const text = 'Jane Doe is a Software Architect with expertise in distributed databases. '.repeat(
      10
    );
    const chunksA = chunkText(text);
    const chunksB = chunkText(text);

    expect(chunksA).toEqual(chunksB);
    expect(chunksA.length).toBeGreaterThan(0);
  });

  it('RAG-2: user B NEVER retrieves user A chunks, even with identical text', async () => {
    // 1. Create User A and User B
    const userA = await prisma.user.create({
      data: {
        email: 'user-a-rag@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: 'user-b-rag@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    const identicalCvText =
      'Lead Architect of Distributed Database Engine at CloudCorp. Scaled Postgres to 50k QPS using pgvector and connection pooling.';

    // 2. Create Document for User A and User B with identical text
    const docA = await prisma.uploadedDocument.create({
      data: {
        userId: userA.id,
        type: 'CV',
        sourceKind: 'PASTED',
        originalName: 'User A CV',
        status: 'READY',
        pastedText: identicalCvText,
        summaryJson: { candidateName: 'User A', coreSkills: ['Postgres', 'pgvector'] },
      },
    });

    const docB = await prisma.uploadedDocument.create({
      data: {
        userId: userB.id,
        type: 'CV',
        sourceKind: 'PASTED',
        originalName: 'User B CV',
        status: 'READY',
        pastedText: identicalCvText,
        summaryJson: { candidateName: 'User B', coreSkills: ['Postgres', 'pgvector'] },
      },
    });

    // 3. Index chunks for both users
    await indexDocumentChunks(docA.id, userA.id, identicalCvText);
    await indexDocumentChunks(docB.id, userB.id, identicalCvText);

    // Verify both have chunks in the database
    const totalChunks = await prisma.documentChunk.count();
    expect(totalChunks).toBe(2);

    // 4. User B queries for Distributed Database Engine
    const retrievedByB = await retrieveRelevantChunks({
      userId: userB.id,
      query: 'Distributed Database Engine pgvector',
      documentIds: [docB.id],
    });

    expect(retrievedByB.length).toBeGreaterThan(0);
    for (const chunk of retrievedByB) {
      // Must strictly belong to User B's document
      expect(chunk.documentId).toBe(docB.id);
      expect(chunk.documentId).not.toBe(docA.id);
    }

    // 5. User B attempts to pass User A's documentId in documentIds array
    const crossQueryByB = await retrieveRelevantChunks({
      userId: userB.id,
      query: 'Distributed Database Engine',
      documentIds: [docA.id], // Passing user A's docId with user B's userId
    });

    // Cross-user chunks are filtered out by WHERE "userId" = userB.id
    expect(crossQueryByB).toHaveLength(0);
  });

  it('RAG-2: retrieval is strictly limited to interview documentIds', async () => {
    const user = await prisma.user.create({
      data: { email: 'multi-doc@example.com', role: 'USER', status: 'ACTIVE' },
    });

    const doc1 = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'CV',
        sourceKind: 'PASTED',
        status: 'READY',
        summaryJson: { coreSkills: ['TypeScript'] },
      },
    });

    const doc2 = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'JD',
        sourceKind: 'PASTED',
        status: 'READY',
        summaryJson: { requiredSkills: ['Rust'] },
      },
    });

    await indexDocumentChunks(
      doc1.id,
      user.id,
      'TypeScript senior architect building web applications with React and Next.js.'
    );
    await indexDocumentChunks(
      doc2.id,
      user.id,
      'Rust backend systems engineer designing low latency operating system kernels.'
    );

    // Query with only doc1 allowed
    const resultsDoc1Only = await retrieveRelevantChunks({
      userId: user.id,
      query: 'systems engineer kernel',
      documentIds: [doc1.id],
    });

    for (const chunk of resultsDoc1Only) {
      expect(chunk.documentId).toBe(doc1.id);
      expect(chunk.documentId).not.toBe(doc2.id);
    }
  });

  it('RAG-4: respects top-k (4) and 3,000 character total cap', async () => {
    const user = await prisma.user.create({
      data: { email: 'caps-test@example.com', role: 'USER', status: 'ACTIVE' },
    });

    const doc = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'CV',
        status: 'READY',
        summaryJson: {},
      },
    });

    // Create a 10,000-character text resulting in ~10 chunks
    const longText = Array.from(
      { length: 12 },
      (_, idx) =>
        `Project Section ${idx + 1}: Detailed engineering accomplishments in cloud computing and data architecture. `.repeat(
          8
        )
    ).join('\n\n');

    await indexDocumentChunks(doc.id, user.id, longText);

    const results = await retrieveRelevantChunks({
      userId: user.id,
      query: 'engineering accomplishments in cloud computing',
      documentIds: [doc.id],
      topK: RAG_TOP_K,
      maxTotalChars: RAG_MAX_TOTAL_CHARS,
    });

    expect(results.length).toBeLessThanOrEqual(RAG_TOP_K);
    const totalChars = results.reduce((sum, c) => sum + c.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(RAG_MAX_TOTAL_CHARS);
  });

  it('RAG-8 & SEC-1: non-READY document blocks starting interview with 422 DOCUMENT_NOT_READY', async () => {
    const user = await prisma.user.create({
      data: { email: 'ready-check@example.com', role: 'USER', status: 'ACTIVE' },
    });

    const otherUser = await prisma.user.create({
      data: { email: 'other-user@example.com', role: 'USER', status: 'ACTIVE' },
    });

    const processingDoc = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'CV',
        status: 'PROCESSING',
      },
    });

    const failedDoc = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'CV',
        status: 'FAILED',
        failureReason: 'NO_TEXT',
      },
    });

    const readyDoc = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'CV',
        status: 'READY',
        summaryJson: { candidateName: 'Ready User' },
      },
    });

    const foreignDoc = await prisma.uploadedDocument.create({
      data: {
        userId: otherUser.id,
        type: 'CV',
        status: 'READY',
        summaryJson: { candidateName: 'Other User' },
      },
    });

    // 1. PROCESSING status -> 422 DOCUMENT_NOT_READY
    await expect(validateDocumentsReady([processingDoc.id], user.id)).rejects.toMatchObject({
      code: 'DOCUMENT_NOT_READY',
      statusCode: 422,
    });

    // 2. FAILED status -> 422 DOCUMENT_NOT_READY
    await expect(validateDocumentsReady([failedDoc.id], user.id)).rejects.toMatchObject({
      code: 'DOCUMENT_NOT_READY',
      statusCode: 422,
    });

    // 3. Other user's document -> 404 NOT_FOUND (SEC-1)
    await expect(validateDocumentsReady([foreignDoc.id], user.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    // 4. READY document with summary -> passes without throwing
    await expect(validateDocumentsReady([readyDoc.id], user.id)).resolves.not.toThrow();
  });

  it('reprocess/replace chunks replaces existing chunks in one atomic transaction without orphaned rows', async () => {
    const user = await prisma.user.create({
      data: { email: 'replace-test@example.com', role: 'USER', status: 'ACTIVE' },
    });

    const doc = await prisma.uploadedDocument.create({
      data: {
        userId: user.id,
        type: 'CV',
        status: 'PROCESSING',
      },
    });

    // First indexing pass
    const initialIndex = await indexDocumentChunks(
      doc.id,
      user.id,
      'Initial content version 1. '.repeat(10)
    );
    expect(initialIndex.chunkCount).toBeGreaterThan(0);

    const countAfterFirst = await prisma.documentChunk.count({
      where: { documentId: doc.id },
    });
    expect(countAfterFirst).toBe(initialIndex.chunkCount);

    // Second indexing pass on the same document (reprocessing)
    const secondIndex = await indexDocumentChunks(
      doc.id,
      user.id,
      'Replaced content version 2. Different text and shorter length.'
    );

    const countAfterSecond = await prisma.documentChunk.count({
      where: { documentId: doc.id },
    });
    expect(countAfterSecond).toBe(secondIndex.chunkCount);
    expect(countAfterSecond).toBe(1);

    const singleChunk = await prisma.documentChunk.findFirst({
      where: { documentId: doc.id },
    });
    expect(singleChunk?.content).toContain('Replaced content version 2');
  });

  it('RAG-3: dimension check validates 768 and startup check enforces schema match', () => {
    const validVector = new Array(EMBEDDING_DIMENSIONS).fill(0.05);
    expect(() => validateEmbeddingDimensions(validVector, EMBEDDING_DIMENSIONS)).not.toThrow();

    expect(() => validateEmbeddingDimensions([0.1, 0.2], EMBEDDING_DIMENSIONS)).toThrowError(
      /Expected embedding dimension 768/
    );

    expect(() => validateStartupEmbeddingConfig(768, 768)).not.toThrow();
    expect(() => validateStartupEmbeddingConfig(512, 768)).toThrowError(
      /Startup embedding dimension mismatch/
    );
  });
});
