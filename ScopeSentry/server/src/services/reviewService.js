import mongoose from 'mongoose';
import { Finding } from '../models/Finding.js';
import { ReviewAction } from '../models/ReviewAction.js';
import { calculateFindingImpact } from '../domain/impactCalculator.js';
import { REVIEW_STATUSES, ERROR_CODES } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Updates review status and writes audit log in one transaction (BR-R1, BR-R2)
 */
export async function updateFindingReviewStatus({
  findingId,
  ownerId,
  reviewStatus,
  comment = null
}) {
  if (!REVIEW_STATUSES.includes(reviewStatus)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid review status. Must be one of: ${REVIEW_STATUSES.join(', ')}`,
      400
    );
  }

  const finding = await Finding.findOne({ _id: findingId, ownerId });
  if (!finding) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Finding not found', 404);
  }

  const fromStatus = finding.reviewStatus;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      finding.reviewStatus = reviewStatus;
      await finding.save({ session });

      await ReviewAction.create(
        [
          {
            findingId: finding._id,
            investigationId: finding.investigationId,
            ownerId,
            type: 'status_change',
            fromStatus,
            toStatus: reviewStatus,
            comment: comment ? String(comment).trim().slice(0, 2000) : null
          }
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  const updated = await Finding.findById(finding._id);
  return formatFindingWithImpact(updated);
}

/**
 * Adds an append-only comment audit record to a finding (BR-R3)
 */
export async function addFindingComment({ findingId, ownerId, comment }) {
  const trimmed = comment ? String(comment).trim() : '';
  if (!trimmed || trimmed.length > 2000) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'Comment must be between 1 and 2000 characters',
      400
    );
  }

  const finding = await Finding.findOne({ _id: findingId, ownerId });
  if (!finding) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Finding not found', 404);
  }

  const auditEntry = await ReviewAction.create({
    findingId: finding._id,
    investigationId: finding.investigationId,
    ownerId,
    type: 'comment',
    comment: trimmed
  });

  return auditEntry;
}

/**
 * Overrides unit price and logs audit entry in one transaction (BR-R5)
 * Recalculates estimated cost difference on read without storing derived values (Section 7).
 */
export async function overrideFindingUnitPrice({
  findingId,
  ownerId,
  unitPriceOverride,
  comment = null
}) {
  const numPrice = Number(unitPriceOverride);
  if (isNaN(numPrice) || numPrice < 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'Unit price override must be a non-negative decimal number',
      400
    );
  }

  const finding = await Finding.findOne({ _id: findingId, ownerId });
  if (!finding) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Finding not found', 404);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      finding.unitPriceOverride = numPrice;
      await finding.save({ session });

      await ReviewAction.create(
        [
          {
            findingId: finding._id,
            investigationId: finding.investigationId,
            ownerId,
            type: 'price_override',
            comment: comment ? String(comment).trim().slice(0, 2000) : `Unit price overridden to $${numPrice.toFixed(2)}`
          }
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  const updated = await Finding.findById(finding._id);
  return formatFindingWithImpact(updated);
}

/**
 * Retrieves chronological audit history for a finding (BR-R3)
 */
export async function getFindingHistory({ findingId, ownerId }) {
  const finding = await Finding.findOne({ _id: findingId, ownerId });
  if (!finding) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Finding not found', 404);
  }

  const history = await ReviewAction.find({ findingId: finding._id })
    .sort({ createdAt: 1 })
    .populate('ownerId', 'name email');

  return history;
}

/**
 * Formats a finding with dynamically computed Section 7 impacts on read
 */
function formatFindingWithImpact(findingDoc) {
  const obj = findingDoc.toJSON ? findingDoc.toJSON() : findingDoc;
  const impact = calculateFindingImpact({
    originalQuantity: obj.originalValue,
    revisedQuantity: obj.revisedValue,
    extractedUnitPrice: obj.extractedUnitPrice,
    unitPriceOverride: obj.unitPriceOverride,
    originalDate: obj.scheduleInfo?.originalDate,
    revisedDate: obj.scheduleInfo?.revisedDate
  });

  return {
    ...obj,
    impact: {
      quantityDifference: impact.quantityDifference,
      percentChange: impact.percentChange,
      activeUnitPrice: impact.activeUnitPrice,
      unitPriceSource: impact.unitPriceSource,
      estimatedCostDifference: impact.estimatedCostDifference,
      costEstimateNote: impact.costEstimateNote,
      priceDelta: impact.priceDelta,
      scheduleDifferenceDays: impact.scheduleDifferenceDays,
      scheduleNote: impact.scheduleNote
    }
  };
}
