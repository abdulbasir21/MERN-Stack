import { describe, it, expect } from 'vitest';
import {
  chunkText,
  shapeRetrievalResults,
  validateEmbeddingDimensions,
  validateStartupEmbeddingConfig,
  RetrievalChunkCandidate,
} from '../../src/lib/chunking.js';
import {
  RAG_CHUNK_SIZE,
  RAG_TOP_K,
  RAG_MAX_TOTAL_CHARS,
  EMBEDDING_DIMENSIONS,
} from '../../src/config/constants.js';

describe('Phase 5 (a) — Deterministic Chunking and RAG Pure Functions (RAG-1, RAG-3, RAG-4)', () => {
  const sampleArticle = `
Section 1: Background and Experience.
Jane Doe is a Senior Full-Stack Engineer with 8 years of experience building mission-critical distributed systems and AI platforms. She has deep expertise in TypeScript, Node.js, Express, Next.js, and PostgreSQL. At Acme Corp, she spearheaded the migration from a monolithic backend to an event-driven microservices architecture hosted on AWS and Kubernetes.

Section 2: High Scale System Architecture.
Jane designed and implemented an asynchronous processing pipeline capable of handling 50,000 events per second with sub-50ms latency. The system utilized Redis for caching and pub/sub messaging, PostgreSQL with pgvector for semantic search, and BullMQ for distributed background job queuing. She optimized database queries reducing P99 latency by 65%.

Section 3: AI and RAG Integrations.
In her recent projects, Jane integrated Google Gemini 2.5 Flash and embeddings to build conversational agents and interactive document analysis workflows. She architected strict atomic quota controls with fail-closed circuit breakers and deterministic context window shaping, ensuring that LLM prompts never exceed token and character limits.

Section 4: Leadership and Mentorship.
Jane led a team of 6 engineers across 3 time zones. She established engineering standards for strict TypeScript adoption, comprehensive automated testing suites, automated CI/CD pipelines, and zero-trust security postures.
`.trim();

  it('RAG-1: chunking is deterministic — identical input produces identical output chunks', () => {
    const run1 = chunkText(sampleArticle);
    const run2 = chunkText(sampleArticle);
    const run3 = chunkText(sampleArticle);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
    expect(run1.length).toBeGreaterThan(0);
    // Every chunk must be non-empty string
    for (const chunk of run1) {
      expect(typeof chunk).toBe('string');
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk.length).toBeLessThanOrEqual(RAG_CHUNK_SIZE);
    }
  });

  it('RAG-1: handles empty and whitespace-only text gracefully', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\t   ')).toEqual([]);
  });

  it('RAG-1: small text below chunkSize returns a single chunk', () => {
    const shortText = 'Jane Doe - Senior Full-Stack Developer';
    const chunks = chunkText(shortText);
    expect(chunks).toEqual([shortText]);
  });

  it('RAG-1: large synthetic document splits with valid size and overlap', () => {
    // Generate text longer than 5,000 characters
    const paragraphs = Array.from(
      { length: 15 },
      (_, i) =>
        `Paragraph ${i + 1}: This is a detailed technical section discussing system architecture item ${i + 1}. ` +
        'It elaborates on resilience, database sharding, transaction isolation levels, and low-latency network protocols. '.repeat(
          3
        )
    );
    const largeDoc = paragraphs.join('\n\n');

    const chunks = chunkText(largeDoc, { chunkSize: 800, chunkOverlap: 100 });
    expect(chunks.length).toBeGreaterThan(4);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].length).toBeLessThanOrEqual(800);
      if (i > 0) {
        // Confirm there is semantic overlap between successive chunks
        const prevWords = chunks[i - 1].split(' ').slice(-10);
        const currWords = chunks[i].split(' ').slice(0, 15);
        const hasOverlap = prevWords.some((w) => currWords.includes(w));
        expect(hasOverlap).toBe(true);
      }
    }
  });

  it('RAG-4: shapes retrieval results by distance ascending, respects top-k (4), and caps at 3,000 chars', () => {
    const candidates: RetrievalChunkCandidate[] = [
      {
        id: 'chunk-3',
        documentId: 'doc-1',
        content: 'Content 3 with moderate distance. '.repeat(20), // ~700 chars
        distance: 0.35,
      },
      {
        id: 'chunk-1',
        documentId: 'doc-1',
        content: 'Content 1 with lowest distance. '.repeat(20), // ~640 chars
        distance: 0.12,
      },
      {
        id: 'chunk-5',
        documentId: 'doc-2',
        content: 'Content 5 with highest distance. '.repeat(20),
        distance: 0.88,
      },
      {
        id: 'chunk-2',
        documentId: 'doc-1',
        content: 'Content 2 with second lowest distance. '.repeat(25), // ~975 chars
        distance: 0.22,
      },
      {
        id: 'chunk-4',
        documentId: 'doc-2',
        content: 'Content 4 with fourth lowest distance. '.repeat(20), // ~780 chars
        distance: 0.45,
      },
      {
        id: 'chunk-6',
        documentId: 'doc-2',
        content: 'Content 6 should be ignored due to top-k. '.repeat(10),
        distance: 0.95,
      },
    ];

    const shaped = shapeRetrievalResults(candidates, RAG_MAX_TOTAL_CHARS, RAG_TOP_K);

    // Must be at most RAG_TOP_K = 4 items
    expect(shaped.length).toBeLessThanOrEqual(RAG_TOP_K);

    // First item must be chunk-1 (lowest distance 0.12)
    expect(shaped[0].id).toBe('chunk-1');
    // Second item must be chunk-2 (distance 0.22)
    expect(shaped[1].id).toBe('chunk-2');

    // Total character count must not exceed RAG_MAX_TOTAL_CHARS = 3,000
    const totalChars = shaped.reduce((sum, c) => sum + c.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(RAG_MAX_TOTAL_CHARS);
  });

  it('RAG-3: validates embedding dimensions (768) and catches dimension mismatch', () => {
    const validVector = new Array(EMBEDDING_DIMENSIONS).fill(0.0123);
    expect(() => validateEmbeddingDimensions(validVector, EMBEDDING_DIMENSIONS)).not.toThrow();

    const shortVector = new Array(512).fill(0.0123);
    expect(() => validateEmbeddingDimensions(shortVector, EMBEDDING_DIMENSIONS)).toThrowError(
      /Expected embedding dimension 768, but received 512/
    );

    const longVector = new Array(1536).fill(0.0123);
    expect(() => validateEmbeddingDimensions(longVector, EMBEDDING_DIMENSIONS)).toThrowError(
      /Expected embedding dimension 768, but received 1536/
    );
  });

  it('RAG-3: startup check fails when configured EMBEDDING_DIMENSIONS differs from vector schema', () => {
    expect(() => validateStartupEmbeddingConfig(768, 768)).not.toThrow();
    expect(() => validateStartupEmbeddingConfig(1536, 768)).toThrowError(
      /Startup embedding dimension mismatch: EMBEDDING_DIMENSIONS \(1536\) must equal database schema dimension \(768\)/
    );
  });
});
