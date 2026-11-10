import { describe, it, expect } from 'vitest';
import {
  add,
  subtract,
  multiply,
  divide,
  quantityDifference,
  estimatedCostDifference,
  priceDelta,
  percentChange,
  roundHalfUp
} from '../../src/domain/math.js';

describe('Phase 1: Domain Math & Decimal Calculations', () => {
  it('guarantees decimal exactness (never floating point error: 0.1 + 0.2 === 0.3)', () => {
    // Standard floating point failure in JS: 0.1 + 0.2 = 0.30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3);

    // Exact decimal domain helpers
    expect(add(0.1, 0.2).toString()).toBe('0.3');
    expect(subtract(0.3, 0.1).toString()).toBe('0.2');
    expect(multiply(0.2, 0.3).toString()).toBe('0.06');
    expect(divide(0.6, 0.2).toString()).toBe('3');
  });

  describe('quantityDifference(revised, original)', () => {
    it('calculates positive quantity difference (added scope)', () => {
      // MASTER_PROMPT example: 20 standard windows -> 32 premium insulated windows
      expect(quantityDifference(32, 20)).toBe('12');
    });

    it('calculates negative quantity difference (scope reduction)', () => {
      expect(quantityDifference(15, 20)).toBe('-5');
    });

    it('calculates zero quantity difference when quantities match', () => {
      expect(quantityDifference(20, 20)).toBe('0');
    });

    it('returns null if either value is null or undefined', () => {
      expect(quantityDifference(null, 20)).toBeNull();
      expect(quantityDifference(32, undefined)).toBeNull();
    });
  });

  describe('estimatedCostDifference(quantityDiff, unitPrice)', () => {
    it('computes exact estimate when unit price is provided', () => {
      // 12 windows * $450.50 unit price = $5406.00
      expect(estimatedCostDifference('12', '450.50')).toBe('5406');
    });

    it('computes negative cost estimate for scope reduction', () => {
      expect(estimatedCostDifference('-5', '200')).toBe('-1000');
    });

    it('returns null when unit price is missing or null (BR-I7: never guess a price)', () => {
      expect(estimatedCostDifference('12', null)).toBeNull();
      expect(estimatedCostDifference('12', undefined)).toBeNull();
      expect(estimatedCostDifference('12', '')).toBeNull();
    });
  });

  describe('priceDelta(originalUnitPrice, revisedUnitPrice, revisedQuantity)', () => {
    it('calculates unit price increase delta correctly', () => {
      // Original $200, revised $250, revised quantity 30 -> (250 - 200) * 30 = 1500
      expect(priceDelta(200, 250, 30)).toBe('1500');
    });

    it('calculates unit price decrease delta correctly', () => {
      expect(priceDelta(250, 200, 30)).toBe('-1500');
    });

    it('returns null if any component is missing', () => {
      expect(priceDelta(null, 250, 30)).toBeNull();
    });
  });

  describe('percentChange(original, revised)', () => {
    it('computes percentage increase correctly', () => {
      // 20 -> 32 is a 60% increase
      expect(percentChange(20, 32)).toBe('60');
    });

    it('computes percentage decrease correctly', () => {
      // 20 -> 10 is a -50% decrease
      expect(percentChange(20, 10)).toBe('-50');
    });

    it('returns null when original value is 0 (division by zero guard)', () => {
      expect(percentChange(0, 50)).toBeNull();
    });

    it('returns null when either input is null or undefined', () => {
      expect(percentChange(null, 50)).toBeNull();
      expect(percentChange(50, null)).toBeNull();
    });
  });

  describe('roundHalfUp(val, decimals)', () => {
    it('rounds half-up to 2 decimals for display/reporting', () => {
      expect(roundHalfUp('12.345')).toBe('12.35');
      expect(roundHalfUp('12.344')).toBe('12.34');
      expect(roundHalfUp('12.3451')).toBe('12.35');
      expect(roundHalfUp('12.3449')).toBe('12.34');
    });

    it('returns null for empty or null inputs', () => {
      expect(roundHalfUp(null)).toBeNull();
    });
  });
});
