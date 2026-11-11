import { CHANGE_CATEGORIES } from '../config/constants.js';

/**
 * Classifies a detected change into one or more BR-I11 categories
 * 
 * @param {Object} changeContext
 * @param {'matched'|'added'|'removed'} changeContext.type
 * @param {Object} [changeContext.original]
 * @param {Object} [changeContext.revised]
 * @returns {string} primary category from CHANGE_CATEGORIES
 */
export function classifyChange({ type, original, revised }) {
  if (type === 'added') {
    return 'requirement_added';
  }

  if (type === 'removed') {
    return 'requirement_removed';
  }

  if (type === 'matched' && original && revised) {
    // Quantity difference
    const origQty = original.quantity !== undefined && original.quantity !== null ? String(original.quantity).trim() : null;
    const revQty = revised.quantity !== undefined && revised.quantity !== null ? String(revised.quantity).trim() : null;
    if (origQty !== null && revQty !== null && origQty !== revQty) {
      return 'quantity_changed';
    }

    // Material difference
    const origMat = original.material ? String(original.material).trim().toLowerCase() : null;
    const revMat = revised.material ? String(revised.material).trim().toLowerCase() : null;
    if (origMat && revMat && origMat !== revMat) {
      return 'material_changed';
    }

    // Specification difference
    const origSpec = original.specification ? String(original.specification).trim().toLowerCase() : null;
    const revSpec = revised.specification ? String(revised.specification).trim().toLowerCase() : null;
    if (origSpec && revSpec && origSpec !== revSpec) {
      return 'specification_changed';
    }

    // Date difference
    const origDate = original.date || original.calendarDate || null;
    const revDate = revised.date || revised.calendarDate || null;
    if (origDate && revDate && origDate !== revDate) {
      return 'date_changed';
    }

    // Unit price / cost difference
    const origPrice = original.unitPrice !== undefined && original.unitPrice !== null ? String(original.unitPrice).trim() : null;
    const revPrice = revised.unitPrice !== undefined && revised.unitPrice !== null ? String(revised.unitPrice).trim() : null;
    if (origPrice !== null && revPrice !== null && origPrice !== revPrice) {
      return 'cost_changed';
    }
  }

  return 'other';
}

/**
 * Detects all applicable change category flags for an item
 * @param {Object} changeContext
 * @returns {string[]}
 */
export function detectAllChangeCategories({ type, original, revised }) {
  const categories = new Set();

  if (type === 'added') {
    categories.add('requirement_added');
    return Array.from(categories);
  }

  if (type === 'removed') {
    categories.add('requirement_removed');
    return Array.from(categories);
  }

  if (original && revised) {
    // Check quantity
    if (
      original.quantity !== undefined && original.quantity !== null &&
      revised.quantity !== undefined && revised.quantity !== null &&
      String(original.quantity).trim() !== String(revised.quantity).trim()
    ) {
      categories.add('quantity_changed');
    }

    // Check material
    const origMat = original.material ? String(original.material).trim().toLowerCase() : null;
    const revMat = revised.material ? String(revised.material).trim().toLowerCase() : null;
    if (origMat && revMat && origMat !== revMat) {
      categories.add('material_changed');
    }

    // Check specification
    const origSpec = original.specification ? String(original.specification).trim().toLowerCase() : null;
    const revSpec = revised.specification ? String(revised.specification).trim().toLowerCase() : null;
    if (origSpec && revSpec && origSpec !== revSpec) {
      categories.add('specification_changed');
    }

    // Check date
    const origDate = original.date || original.calendarDate || null;
    const revDate = revised.date || revised.calendarDate || null;
    if (origDate && revDate && origDate !== revDate) {
      categories.add('date_changed');
    }

    // Check cost / unit price
    const origPrice = original.unitPrice !== undefined && original.unitPrice !== null ? String(original.unitPrice).trim() : null;
    const revPrice = revised.unitPrice !== undefined && revised.unitPrice !== null ? String(revised.unitPrice).trim() : null;
    if (origPrice !== null && revPrice !== null && origPrice !== revPrice) {
      categories.add('cost_changed');
    }
  }

  if (categories.size === 0) {
    categories.add('other');
  }

  return Array.from(categories).filter((cat) => CHANGE_CATEGORIES.includes(cat));
}
