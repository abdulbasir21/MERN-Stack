/**
 * Normalizes an item key from clause number / identifier and item name
 * @param {string|null|undefined} clauseNumber
 * @param {string|null|undefined} itemName
 * @returns {string}
 */
export function normalizeItemKey(clauseNumber, itemName) {
  let normClause = String(clauseNumber || '')
    .trim()
    .toLowerCase()
    .replace(/^(section|clause|division|part|article)\s*/i, '') // strip common prefix keywords
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9.]/g, ''); // keep alphanumeric and dots

  const normName = String(itemName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '');

  if (normClause && normName) {
    return `${normClause}::${normName}`;
  }
  return normClause || normName || 'unknown_item';
}

/**
 * Deterministic comparison and matching between extracted original and revised items (BR-I6 Stage 2)
 * Exact values (clause numbers, quantities, dates, prices) are compared deterministically.
 * 
 * @param {Array<Object>} originalItems
 * @param {Array<Object>} revisedItems
 * @returns {{
 *   matched: Array<{ original: Object, revised: Object, changed: boolean }>,
 *   added: Array<Object>,
 *   removed: Array<Object>,
 *   unchanged: Array<{ original: Object, revised: Object }>
 * }}
 */
export function matchItems(originalItems = [], revisedItems = []) {
  const origMap = new Map();
  const revMap = new Map();

  for (const item of originalItems) {
    const key = normalizeItemKey(item.clauseNumber || item.sectionNumber, item.name || item.title);
    if (!origMap.has(key)) {
      origMap.set(key, item);
    }
  }

  for (const item of revisedItems) {
    const key = normalizeItemKey(item.clauseNumber || item.sectionNumber, item.name || item.title);
    if (!revMap.has(key)) {
      revMap.set(key, item);
    }
  }

  const matched = [];
  const unchanged = [];
  const added = [];
  const removed = [];

  // Check original items against revised
  for (const [key, origItem] of origMap.entries()) {
    if (revMap.has(key)) {
      const revItem = revMap.get(key);
      const isChanged = hasDeterministicChanges(origItem, revItem);
      if (isChanged) {
        matched.push({ original: origItem, revised: revItem, changed: true });
      } else {
        unchanged.push({ original: origItem, revised: revItem });
      }
    } else {
      removed.push(origItem);
    }
  }

  // Check revised items that were not in original
  for (const [key, revItem] of revMap.entries()) {
    if (!origMap.has(key)) {
      added.push(revItem);
    }
  }

  return {
    matched,
    unchanged,
    added,
    removed
  };
}

/**
 * Checks if two matched items differ in quantity, material, specification, date, or unit price
 * @param {Object} orig
 * @param {Object} rev
 * @returns {boolean}
 */
export function hasDeterministicChanges(orig, rev) {
  // Quantity check
  const origQty = orig.quantity !== undefined && orig.quantity !== null ? String(orig.quantity).trim() : null;
  const revQty = rev.quantity !== undefined && rev.quantity !== null ? String(rev.quantity).trim() : null;
  if (origQty !== revQty) return true;

  // Material check
  const origMat = orig.material ? String(orig.material).trim().toLowerCase() : null;
  const revMat = rev.material ? String(rev.material).trim().toLowerCase() : null;
  if (origMat !== revMat) return true;

  // Specification check
  const origSpec = orig.specification ? String(orig.specification).trim().toLowerCase() : null;
  const revSpec = rev.specification ? String(rev.specification).trim().toLowerCase() : null;
  if (origSpec !== revSpec) return true;

  // Date check
  const origDate = orig.date || orig.calendarDate || null;
  const revDate = rev.date || rev.calendarDate || null;
  if (origDate !== revDate) return true;

  // Unit price check
  const origPrice = orig.unitPrice !== undefined && orig.unitPrice !== null ? String(orig.unitPrice).trim() : null;
  const revPrice = rev.unitPrice !== undefined && rev.unitPrice !== null ? String(rev.unitPrice).trim() : null;
  if (origPrice !== revPrice) return true;

  return false;
}
