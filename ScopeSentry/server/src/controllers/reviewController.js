import { z } from 'zod';
import {
  updateFindingReviewStatus,
  addFindingComment,
  overrideFindingUnitPrice,
  getFindingHistory
} from '../services/reviewService.js';
import { REVIEW_STATUSES } from '../config/constants.js';

export const updateReviewSchema = z.object({
  reviewStatus: z.enum(REVIEW_STATUSES),
  comment: z.string().max(2000).optional().nullable()
});

export const addCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required').max(2000, 'Comment exceeds 2000 characters')
});

export const unitPriceOverrideSchema = z.object({
  unitPriceOverride: z.number().min(0, 'Unit price must be non-negative'),
  comment: z.string().max(2000).optional().nullable()
});

export async function updateFindingReviewHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewStatus, comment } = req.body;

    const finding = await updateFindingReviewStatus({
      findingId: id,
      ownerId: req.user.id,
      reviewStatus,
      comment
    });

    res.json({ data: { finding } });
  } catch (err) {
    next(err);
  }
}

export async function addFindingCommentHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const action = await addFindingComment({
      findingId: id,
      ownerId: req.user.id,
      comment
    });

    res.status(201).json({ data: { action } });
  } catch (err) {
    next(err);
  }
}

export async function overrideFindingUnitPriceHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { unitPriceOverride, comment } = req.body;

    const finding = await overrideFindingUnitPrice({
      findingId: id,
      ownerId: req.user.id,
      unitPriceOverride,
      comment
    });

    res.json({ data: { finding } });
  } catch (err) {
    next(err);
  }
}

export async function getFindingHistoryHandler(req, res, next) {
  try {
    const { id } = req.params;
    const history = await getFindingHistory({
      findingId: id,
      ownerId: req.user.id
    });

    res.json({ data: { history } });
  } catch (err) {
    next(err);
  }
}
