import { describe, it, expect } from 'vitest';
import { computeInvestigationInputHash } from '../../src/domain/inputHash.js';
import { normalizeItemKey, matchItems, hasDeterministicChanges } from '../../src/domain/itemMatcher.js';
import { classifyChange, detectAllChangeCategories } from '../../src/domain/changeClassifier.js';
import { calculateFindingImpact } from '../../src/domain/impactCalculator.js';
import { evaluateFindingConfidence } from '../../src/domain/confidence.js';
import { evaluateApprovalEvidence } from '../../src/domain/approvalStatus.js';
import {
  extractedItemSchema,
  detectedChangeSchema,
  assembledFindingSchema
} from '../../src/domain/investigationSchemas.js';

describe('Phase 6a: Investigation Engine Pure Domain Functions', () => {
  describe('BR-I3: Input Hash Computation', () => {
    const projId = 'proj_123';
    const origDoc = 'doc_orig_1';
    const revDoc = 'doc_rev_2';

    it('computes deterministic SHA-256 hash', () => {
      const hash = computeInvestigationInputHash({
        projectId: projId,
        originalDocumentId: origDoc,
        revisedDocumentId: revDoc,
        supportingDocumentIds: ['doc_supp_a', 'doc_supp_b']
      });

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('is strictly order-independent for supporting documents', () => {
      const hash1 = computeInvestigationInputHash({
        projectId: projId,
        originalDocumentId: origDoc,
        revisedDocumentId: revDoc,
        supportingDocumentIds: ['doc_supp_b', 'doc_supp_a', 'doc_supp_c']
      });

      const hash2 = computeInvestigationInputHash({
        projectId: projId,
        originalDocumentId: origDoc,
        revisedDocumentId: revDoc,
        supportingDocumentIds: ['doc_supp_a', 'doc_supp_c', 'doc_supp_b']
      });

      expect(hash1).toBe(hash2);
    });

    it('produces different hash when any document changes', () => {
      const hash1 = computeInvestigationInputHash({
        projectId: projId,
        originalDocumentId: origDoc,
        revisedDocumentId: revDoc
      });

      const hash2 = computeInvestigationInputHash({
        projectId: projId,
        originalDocumentId: 'doc_orig_different',
        revisedDocumentId: revDoc
      });

      expect(hash1).not.toBe(hash2);
    });

    it('throws when required identifiers are missing', () => {
      expect(() =>
        computeInvestigationInputHash({
          projectId: '',
          originalDocumentId: origDoc,
          revisedDocumentId: revDoc
        })
      ).toThrow();
    });
  });

  describe('Item Normalization and Deterministic Matching (BR-I6 Stage 2)', () => {
    it('normalizes item keys with clause numbers and item titles', () => {
      const key1 = normalizeItemKey('Section 08 51 13', 'Aluminum Windows');
      const key2 = normalizeItemKey('085113', 'aluminum windows');
      expect(key1).toBe('085113::aluminum windows');
      expect(key2).toBe('085113::aluminum windows');
    });

    it('matches identical items and marks them unchanged', () => {
      const orig = [{ clauseNumber: '08 51 13', name: 'Aluminum Windows', quantity: '20', material: 'standard' }];
      const rev = [{ clauseNumber: '08 51 13', name: 'Aluminum Windows', quantity: '20', material: 'standard' }];

      const res = matchItems(orig, rev);
      expect(res.matched).toHaveLength(0);
      expect(res.unchanged).toHaveLength(1);
      expect(res.added).toHaveLength(0);
      expect(res.removed).toHaveLength(0);
    });

    it('detects changes when quantities or materials differ', () => {
      const orig = [{ clauseNumber: '08 51 13', name: 'Aluminum Windows', quantity: '20', material: 'standard' }];
      const rev = [{ clauseNumber: '08 51 13', name: 'Aluminum Windows', quantity: '32', material: 'premium insulated' }];

      const res = matchItems(orig, rev);
      expect(res.matched).toHaveLength(1);
      expect(res.matched[0].changed).toBe(true);
      expect(res.unchanged).toHaveLength(0);
    });

    it('exact quantity mismatch is never hidden by semantic similarity', () => {
      const orig = { clauseNumber: '4.2', name: 'HVAC Units', quantity: '10' };
      const rev = { clauseNumber: '4.2', name: 'HVAC Units', quantity: '11' };

      expect(hasDeterministicChanges(orig, rev)).toBe(true);
    });

    it('detects added requirements', () => {
      const orig = [];
      const rev = [{ clauseNumber: '10.1', name: 'Fire Suppression Valve', quantity: '4' }];

      const res = matchItems(orig, rev);
      expect(res.added).toHaveLength(1);
      expect(res.added[0].name).toBe('Fire Suppression Valve');
    });

    it('detects removed requirements', () => {
      const orig = [{ clauseNumber: '09 90 00', name: 'Decorative Wall Covering', quantity: '1' }];
      const rev = [];

      const res = matchItems(orig, rev);
      expect(res.removed).toHaveLength(1);
      expect(res.removed[0].name).toBe('Decorative Wall Covering');
    });
  });

  describe('Change Classification (BR-I11)', () => {
    it('classifies quantity change as primary category', () => {
      const cat = classifyChange({
        type: 'matched',
        original: { quantity: '20', material: 'standard' },
        revised: { quantity: '32', material: 'standard' }
      });
      expect(cat).toBe('quantity_changed');
    });

    it('classifies material change when quantity is unchanged', () => {
      const cat = classifyChange({
        type: 'matched',
        original: { quantity: '20', material: 'standard' },
        revised: { quantity: '20', material: 'triple glazed insulated' }
      });
      expect(cat).toBe('material_changed');
    });

    it('detects multiple categories in detectAllChangeCategories', () => {
      const categories = detectAllChangeCategories({
        type: 'matched',
        original: { quantity: '20', material: 'standard' },
        revised: { quantity: '32', material: 'premium insulated' }
      });
      expect(categories).toContain('quantity_changed');
      expect(categories).toContain('material_changed');
    });

    it('classifies added and removed requirements', () => {
      expect(classifyChange({ type: 'added', revised: { name: 'New Generator' } })).toBe('requirement_added');
      expect(classifyChange({ type: 'removed', original: { name: 'Old Siding' } })).toBe('requirement_removed');
    });

    it('classifies date changes', () => {
      const cat = classifyChange({
        type: 'matched',
        original: { date: '2026-05-01' },
        revised: { date: '2026-05-20' }
      });
      expect(cat).toBe('date_changed');
    });
  });

  describe('Fictional Scenario: 20 standard windows → 32 premium insulated windows (Section 7)', () => {
    it('calculates quantity difference (+12) and cost estimate with unit price', () => {
      const impact = calculateFindingImpact({
        originalQuantity: '20',
        revisedQuantity: '32',
        extractedUnitPrice: '450.00' // $450 each
      });

      expect(impact.quantityDifference).toBe('12');
      expect(impact.percentChange).toBe('60'); // +60%
      expect(impact.activeUnitPrice).toBe('450.00');
      expect(impact.unitPriceSource).toBe('extracted');
      expect(impact.estimatedCostDifference).toBe('5400'); // 12 * 450 = 5400
      expect(impact.costEstimateNote).toBeNull();
    });

    it('returns null with clear note when no unit price is supplied (BR-I7: never guess a price)', () => {
      const impact = calculateFindingImpact({
        originalQuantity: '20',
        revisedQuantity: '32',
        extractedUnitPrice: null
      });

      expect(impact.quantityDifference).toBe('12');
      expect(impact.estimatedCostDifference).toBeNull();
      expect(impact.costEstimateNote).toBe('Cannot estimate: no unit price supplied');
    });

    it('user unit price override takes precedence over extracted price', () => {
      const impact = calculateFindingImpact({
        originalQuantity: '20',
        revisedQuantity: '32',
        extractedUnitPrice: '450.00',
        unitPriceOverride: '500.00'
      });

      expect(impact.activeUnitPrice).toBe('500.00');
      expect(impact.unitPriceSource).toBe('override');
      expect(impact.estimatedCostDifference).toBe('6000'); // 12 * 500 = 6000
    });

    it('calculates unit price delta when unit price itself changed', () => {
      const impact = calculateFindingImpact({
        originalQuantity: '20',
        revisedQuantity: '32',
        originalUnitPrice: '400.00',
        revisedUnitPrice: '450.00'
      });

      // priceDelta = (450 - 400) * 32 = 50 * 32 = 1600
      expect(impact.priceDelta).toBe('1600');
    });

    it('calculates calendar date differences in whole UTC days', () => {
      const impact = calculateFindingImpact({
        originalDate: '2026-03-01',
        revisedDate: '2026-03-15'
      });

      expect(impact.scheduleDifferenceDays).toBe(14);
      expect(impact.scheduleNote).toBeNull();
    });

    it('returns schedule not determinable if dates are invalid or missing', () => {
      const impact = calculateFindingImpact({
        originalDate: '2026-03-01',
        revisedDate: 'invalid-date'
      });

      expect(impact.scheduleDifferenceDays).toBeNull();
      expect(impact.scheduleNote).toBe('Schedule impact not determinable');
    });
  });

  describe('Confidence Rules (BR-I10)', () => {
    it('rates high confidence for exact clause match + exact quantity + verified evidence', () => {
      const res = evaluateFindingConfidence({
        exactClauseMatch: true,
        exactQuantityMatch: true,
        hasVerifiedEvidence: true
      });

      expect(res.confidence).toBe('high');
      expect(res.uncertaintyNote).toContain('Confirmed from matching clause identifiers');
    });

    it('rates medium confidence for AI-matched with verified evidence', () => {
      const res = evaluateFindingConfidence({
        exactClauseMatch: false,
        isAiMatched: true,
        hasVerifiedEvidence: true
      });

      expect(res.confidence).toBe('medium');
      expect(res.uncertaintyNote).toContain('AI-interpreted');
    });

    it('rates low confidence when evidence is missing or unverified', () => {
      const res = evaluateFindingConfidence({
        isAiMatched: true,
        hasVerifiedEvidence: false
      });

      expect(res.confidence).toBe('low');
      expect(res.uncertaintyNote).toContain('Semantic AI interpretation without complete grounding');
    });
  });

  describe('Approval Evidence Evaluation (BR-I9)', () => {
    it('defaults to not_found when evidence list is empty (never guesses)', () => {
      const res = evaluateApprovalEvidence([]);
      expect(res.status).toBe('not_found');
      expect(res.evidence).toHaveLength(0);
    });

    it('identifies approved_in_writing when approval signatures exist', () => {
      const evidence = [{ snippet: 'Change Order #4 approved by Owner on 2026-04-12', chunkId: 'c1' }];
      const res = evaluateApprovalEvidence(evidence);
      expect(res.status).toBe('approved_in_writing');
    });

    it('identifies pending_signature when change is pending', () => {
      const evidence = [{ snippet: 'Proposed change submitted for review and awaiting signature', chunkId: 'c2' }];
      const res = evaluateApprovalEvidence(evidence);
      expect(res.status).toBe('pending_signature');
    });
  });

  describe('Stage Zod Schemas Validation (BR-I6)', () => {
    it('validates extracted item schema', () => {
      const item = {
        clauseNumber: 'Section 08 51 13',
        name: 'Aluminum Windows',
        quantity: 32,
        unit: 'units',
        material: 'insulated aluminum',
        unitPrice: 450
      };
      expect(() => extractedItemSchema.parse(item)).not.toThrow();
    });

    it('validates detected change schema', () => {
      const change = {
        type: 'matched',
        primaryCategory: 'quantity_changed',
        itemKey: '085113::aluminum windows',
        title: 'Window count increase in Section 08 51 13',
        differences: ['quantity: 20 -> 32']
      };
      expect(() => detectedChangeSchema.parse(change)).not.toThrow();
    });

    it('validates assembled finding schema', () => {
      const finding = {
        title: 'Section 08 51 13 - Window quantity increase',
        category: 'quantity_changed',
        originalValue: '20',
        revisedValue: '32',
        unit: 'units',
        extractedUnitPrice: '450.00',
        description: 'Window quantity increased from 20 to 32 units with specification upgrade.',
        evidence: [
          {
            documentId: 'doc1',
            chunkId: 'chunk1',
            snippet: 'Install 20 standard windows',
            page: 12
          }
        ],
        confidence: 'high',
        uncertaintyNote: 'Confirmed from matching clause identifiers.',
        flags: ['quantity_changed', 'material_changed']
      };

      const parsed = assembledFindingSchema.parse(finding);
      expect(parsed.approvalEvidence.status).toBe('not_found');
      expect(parsed.category).toBe('quantity_changed');
    });

    it('rejects finding with invalid category', () => {
      const invalidFinding = {
        title: 'Test',
        category: 'unsupported_category',
        description: 'Invalid'
      };
      expect(() => assembledFindingSchema.parse(invalidFinding)).toThrow();
    });
  });
});
