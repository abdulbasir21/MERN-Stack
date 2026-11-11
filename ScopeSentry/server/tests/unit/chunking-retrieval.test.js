import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { chunkDocument, detectSectionLabel } from '../../src/domain/chunker.js';
import { reciprocalRankFusion } from '../../src/domain/rrf.js';
import { buildRetrievalFilter } from '../../src/domain/retrievalFilter.js';
import { verifySnippetInChunk } from '../../src/domain/snippetVerifier.js';

describe('Phase 5a: Pure Functions for Chunking, RRF & Retrieval Filtering', () => {
  describe('Chunker (BR-C1, BR-C2)', () => {
    it('detects CSI MasterFormat and construction clause numbers in section headers', () => {
      const csi1 = 'SECTION 08 51 13 - ALUMINUM WINDOWS\nGeneral requirements.';
      expect(detectSectionLabel(csi1)).toBe('Section 08 51 13 - ALUMINUM WINDOWS');

      const csi2 = '\n08 51 13 Aluminum Windows Specifications';
      expect(detectSectionLabel(csi2)).toBe('Section 08 51 13 - Aluminum Windows Specifications');

      const clause = 'Clause 4.2.1 - Scope Variation Procedure\nNotice required within 5 days.';
      expect(detectSectionLabel(clause)).toBe('Section 4.2.1 - Scope Variation Procedure');
    });

    it('splits document carrying page numbers and preserving section labels', () => {
      const pages = [
        {
          num: 1,
          text: 'SECTION 08 51 13 - ALUMINUM WINDOWS\nPart 1: Contractor shall furnish and install all window units.'
        },
        {
          num: 2,
          text: 'Part 2: Products. Window frame alloy 6063-T6. Double glazed insulated units.'
        }
      ];

      const chunks = chunkDocument({ text: 'Combined', pages, targetSize: 200, overlapSize: 30 });
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].pageNumber).toBe(1);
      expect(chunks[0].sectionLabel).toContain('08 51 13');

      expect(chunks[1].chunkIndex).toBe(1);
      expect(chunks[1].pageNumber).toBe(2);
      expect(chunks[1].sectionLabel).toContain('08 51 13');
    });

    it('respects chunk target size limits and maintains sliding overlap', () => {
      const longText = Array(20)
        .fill('Paragraph with detailed construction specification requirements and milestone tolerances.')
        .join('\n\n');

      const targetSize = 300;
      const overlapSize = 50;

      const chunks = chunkDocument({
        text: longText,
        targetSize,
        overlapSize
      });

      expect(chunks.length).toBeGreaterThan(1);
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].chunkIndex).toBe(i);
        expect(chunks[i].text.length).toBeLessThanOrEqual(targetSize + 150); // within tolerance
      }

      // Check overlap between consecutive chunks
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentEnd = chunks[i].text.slice(-30);
        const nextStart = chunks[i + 1].text.slice(0, 80);
        // Next chunk should contain text from the end of the previous chunk
        expect(nextStart.toLowerCase()).toContain(currentEnd.toLowerCase().slice(0, 15));
      }
    });

    it('returns empty array for empty or whitespace text', () => {
      expect(chunkDocument({ text: '' })).toEqual([]);
      expect(chunkDocument({ text: '   \n\t  ' })).toEqual([]);
    });
  });

  describe('Reciprocal Rank Fusion (RRF)', () => {
    it('fuses vector and keyword rankings correctly using RRF formula', () => {
      const vectorResults = [
        { id: 'chunk_A', text: 'Vector top result' }, // rank 1
        { id: 'chunk_B', text: 'Vector second result' } // rank 2
      ];

      const keywordResults = [
        { id: 'chunk_B', text: 'Keyword top result' }, // rank 1
        { id: 'chunk_C', text: 'Keyword second result' } // rank 2
      ];

      const fused = reciprocalRankFusion(
        [
          { name: 'vector', items: vectorResults },
          { name: 'keyword', items: keywordResults }
        ],
        60
      );

      // chunk_B has rank 2 in vector + rank 1 in keyword -> score: 1/(60+2) + 1/(60+1) = 1/62 + 1/61 = 0.016129 + 0.016393 = 0.032522
      // chunk_A has rank 1 in vector -> score: 1/(60+1) = 0.016393
      // chunk_C has rank 2 in keyword -> score: 1/(60+2) = 0.016129
      expect(fused[0].id).toBe('chunk_B');
      expect(fused[1].id).toBe('chunk_A');
      expect(fused[2].id).toBe('chunk_C');

      expect(fused[0].rrfScore).toBeCloseTo(1 / 62 + 1 / 61, 5);
      expect(fused[1].rrfScore).toBeCloseTo(1 / 61, 5);
      expect(fused[2].rrfScore).toBeCloseTo(1 / 62, 5);
    });

    it('handles ties deterministically by comparing item id', () => {
      const list = [
        { id: 'chunk_Z', text: 'Item Z' },
        { id: 'chunk_A', text: 'Item A' }
      ];

      // If scores are equal, sort by id
      const fused = reciprocalRankFusion([{ name: 'single', items: list }], 60);
      expect(fused[0].id).toBe('chunk_Z'); // rank 1 has higher score than rank 2
      expect(fused[1].id).toBe('chunk_A');
    });

    it('handles empty input gracefully', () => {
      expect(reciprocalRankFusion([])).toEqual([]);
      expect(reciprocalRankFusion(null)).toEqual([]);
    });
  });

  describe('Retrieval Filter Builder (BR-C4)', () => {
    it('throws error when ownerId or projectId is missing', () => {
      const validId = new mongoose.Types.ObjectId().toString();

      expect(() => buildRetrievalFilter({ ownerId: null, projectId: validId })).toThrow(
        /requires both ownerId and projectId/i
      );

      expect(() => buildRetrievalFilter({ ownerId: validId, projectId: null })).toThrow(
        /requires both ownerId and projectId/i
      );

      expect(() => buildRetrievalFilter({})).toThrow(/requires both ownerId and projectId/i);
    });

    it('builds scoped MongoDB filter matching owner and project', () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const projectId = new mongoose.Types.ObjectId().toString();
      const documentId = new mongoose.Types.ObjectId().toString();

      const filter = buildRetrievalFilter({
        ownerId,
        projectId,
        documentId,
        documentCategory: 'revised_specification'
      });

      expect(filter.ownerId.toString()).toBe(ownerId);
      expect(filter.projectId.toString()).toBe(projectId);
      expect(filter.documentId.toString()).toBe(documentId);
      expect(filter.documentCategory).toBe('revised_specification');
    });
  });

  describe('Snippet-in-Chunk Verification (BR-I8)', () => {
    const chunkText =
      'Contractor shall install 32 premium insulated windows (triple-glazed, argon gas filled) in accordance with Section 08 51 13.';

    it('accepts exact substring citations', () => {
      const snippet = '32 premium insulated windows (triple-glazed, argon gas filled)';
      const result = verifySnippetInChunk(snippet, chunkText);
      expect(result.verified).toBe(true);
      expect(result.exactMatch).toBe(true);
    });

    it('accepts citations with normalized whitespace and case variance', () => {
      const snippet = '32  PREMIUM  INSULATED\nWINDOWS';
      const result = verifySnippetInChunk(snippet, chunkText);
      expect(result.verified).toBe(true);
      expect(result.exactMatch).toBe(false);
    });

    it('rejects invented / hallucinated snippets not present in the chunk', () => {
      const hallucinated = 'Contractor shall install 50 gold-plated windows with remote blinds';
      const result = verifySnippetInChunk(hallucinated, chunkText);
      expect(result.verified).toBe(false);
      expect(result.reason).toMatch(/does not exist within/i);
    });

    it('rejects empty snippets or empty chunk text', () => {
      expect(verifySnippetInChunk('', chunkText).verified).toBe(false);
      expect(verifySnippetInChunk('any snippet', '').verified).toBe(false);
    });
  });
});
