import { Decimal } from 'decimal.js';

// Configure Decimal.js with high precision and standard half-up rounding
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(val) {
  if (val === null || val === undefined || val === '') {
    return null;
  }
  return new Decimal(val);
}

export function add(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  if (decA === null || decB === null) return null;
  return decA.plus(decB);
}

export function subtract(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  if (decA === null || decB === null) return null;
  return decA.minus(decB);
}

export function multiply(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  if (decA === null || decB === null) return null;
  return decA.times(decB);
}

export function divide(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  if (decA === null || decB === null || decB.isZero()) return null;
  return decA.dividedBy(decB);
}

/**
 * Business rule:
 * quantityDifference = revisedQuantity − originalQuantity (signed; may be negative)
 */
export function quantityDifference(revisedQuantity, originalQuantity) {
  const rev = toDecimal(revisedQuantity);
  const orig = toDecimal(originalQuantity);
  if (rev === null || orig === null) {
    return null;
  }
  return rev.minus(orig).toString();
}

/**
 * Business rule:
 * estimatedCostDifference = quantityDifference × unitPrice
 * where unitPrice = unitPriceOverride if present, else confirmed document unit price, else null.
 * If unitPrice is null: return null ("Cannot estimate: no unit price supplied"). Never guess.
 */
export function estimatedCostDifference(quantityDiff, unitPrice) {
  if (quantityDiff === null || quantityDiff === undefined || unitPrice === null || unitPrice === undefined || unitPrice === '') {
    return null;
  }
  const qDiff = toDecimal(quantityDiff);
  const uPrice = toDecimal(unitPrice);
  if (qDiff === null || uPrice === null) {
    return null;
  }
  return qDiff.times(uPrice).toString();
}

/**
 * priceDelta = (revisedUnitPrice − originalUnitPrice) × revisedQuantity
 */
export function priceDelta(originalUnitPrice, revisedUnitPrice, revisedQuantity) {
  const origPrice = toDecimal(originalUnitPrice);
  const revPrice = toDecimal(revisedUnitPrice);
  const revQty = toDecimal(revisedQuantity);

  if (origPrice === null || revPrice === null || revQty === null) {
    return null;
  }
  return revPrice.minus(origPrice).times(revQty).toString();
}

/**
 * Percent change = (revised − original) / original × 100
 * If original = 0 or null -> return null
 */
export function percentChange(original, revised) {
  const orig = toDecimal(original);
  const rev = toDecimal(revised);

  if (orig === null || rev === null || orig.isZero()) {
    return null;
  }

  return rev.minus(orig).dividedBy(orig).times(100).toString();
}

/**
 * Display/report rounding: round half-up to configured decimals (default 2)
 */
export function roundHalfUp(val, decimals = 2) {
  const dec = toDecimal(val);
  if (dec === null) return null;
  return dec.toFixed(decimals, Decimal.ROUND_HALF_UP);
}
