import {
  quantityDifference,
  estimatedCostDifference,
  priceDelta,
  percentChange
} from './math.js';
import { calendarDateDiffDays, isValidCalendarDate } from './dates.js';

/**
 * Calculates domain impacts (cost, quantity, schedule) for a detected change
 * Never stores derived values; this calculation runs pure and on read/report generation.
 * 
 * @param {Object} params
 * @param {string|number|null} [params.originalQuantity]
 * @param {string|number|null} [params.revisedQuantity]
 * @param {string|number|null} [params.extractedUnitPrice]
 * @param {string|number|null} [params.unitPriceOverride]
 * @param {string|number|null} [params.originalUnitPrice]
 * @param {string|number|null} [params.revisedUnitPrice]
 * @param {string|null} [params.originalDate] YYYY-MM-DD
 * @param {string|null} [params.revisedDate] YYYY-MM-DD
 * @returns {{
 *   quantityDifference: string|null,
 *   percentChange: string|null,
 *   activeUnitPrice: string|null,
 *   unitPriceSource: 'override'|'extracted'|'none',
 *   estimatedCostDifference: string|null,
 *   costEstimateNote: string|null,
 *   priceDelta: string|null,
 *   scheduleDifferenceDays: number|null,
 *   scheduleNote: string|null
 * }}
 */
export function calculateFindingImpact({
  originalQuantity = null,
  revisedQuantity = null,
  extractedUnitPrice = null,
  unitPriceOverride = null,
  originalUnitPrice = null,
  revisedUnitPrice = null,
  originalDate = null,
  revisedDate = null
} = {}) {
  // 1. Quantity Difference & Percent Change
  let qtyDiff = null;
  let pctChange = null;

  if (originalQuantity !== null && revisedQuantity !== null && originalQuantity !== '' && revisedQuantity !== '') {
    try {
      qtyDiff = quantityDifference(revisedQuantity, originalQuantity);
      pctChange = percentChange(originalQuantity, revisedQuantity);
    } catch {
      qtyDiff = null;
      pctChange = null;
    }
  }

  // 2. Unit Price Resolution (Override wins over extracted)
  let activeUnitPrice = null;
  let unitPriceSource = 'none';

  if (unitPriceOverride !== null && unitPriceOverride !== undefined && String(unitPriceOverride).trim() !== '') {
    activeUnitPrice = String(unitPriceOverride).trim();
    unitPriceSource = 'override';
  } else if (extractedUnitPrice !== null && extractedUnitPrice !== undefined && String(extractedUnitPrice).trim() !== '') {
    activeUnitPrice = String(extractedUnitPrice).trim();
    unitPriceSource = 'extracted';
  }

  // 3. Estimated Cost Difference
  let costDiff = null;
  let costEstimateNote = null;

  if (qtyDiff !== null) {
    if (activeUnitPrice !== null) {
      try {
        costDiff = estimatedCostDifference(qtyDiff, activeUnitPrice);
      } catch {
        costDiff = null;
        costEstimateNote = 'Calculation error';
      }
    } else {
      costEstimateNote = 'Cannot estimate: no unit price supplied';
    }
  }

  // 4. Unit Price Delta (when unit price itself changed)
  let unitPriceDeltaVal = null;
  if (
    originalUnitPrice !== null && originalUnitPrice !== undefined && String(originalUnitPrice).trim() !== '' &&
    revisedUnitPrice !== null && revisedUnitPrice !== undefined && String(revisedUnitPrice).trim() !== '' &&
    revisedQuantity !== null && revisedQuantity !== undefined && String(revisedQuantity).trim() !== ''
  ) {
    try {
      unitPriceDeltaVal = priceDelta(originalUnitPrice, revisedUnitPrice, revisedQuantity);
    } catch {
      unitPriceDeltaVal = null;
    }
  }

  // 5. Schedule Days Difference
  let schedDays = null;
  let scheduleNote = null;

  if (originalDate && revisedDate) {
    if (isValidCalendarDate(originalDate) && isValidCalendarDate(revisedDate)) {
      try {
        schedDays = calendarDateDiffDays(originalDate, revisedDate);
      } catch {
        schedDays = null;
        scheduleNote = 'Schedule impact not determinable';
      }
    } else {
      scheduleNote = 'Schedule impact not determinable';
    }
  } else if (originalDate || revisedDate) {
    scheduleNote = 'Schedule impact not determinable';
  }

  return {
    quantityDifference: qtyDiff,
    percentChange: pctChange,
    activeUnitPrice,
    unitPriceSource,
    estimatedCostDifference: costDiff,
    costEstimateNote,
    priceDelta: unitPriceDeltaVal,
    scheduleDifferenceDays: schedDays,
    scheduleNote
  };
}
