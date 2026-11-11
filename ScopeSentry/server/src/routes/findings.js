import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import {
  updateFindingReviewHandler,
  updateReviewSchema,
  addFindingCommentHandler,
  addCommentSchema,
  overrideFindingUnitPriceHandler,
  unitPriceOverrideSchema,
  getFindingHistoryHandler
} from '../controllers/reviewController.js';

const router = express.Router();

router.patch(
  '/findings/:id/review',
  authenticate,
  csrfProtection,
  validate(updateReviewSchema, 'body'),
  updateFindingReviewHandler
);

router.post(
  '/findings/:id/comments',
  authenticate,
  csrfProtection,
  validate(addCommentSchema, 'body'),
  addFindingCommentHandler
);

router.patch(
  '/findings/:id/price-override',
  authenticate,
  csrfProtection,
  validate(unitPriceOverrideSchema, 'body'),
  overrideFindingUnitPriceHandler
);

router.get(
  '/findings/:id/history',
  authenticate,
  getFindingHistoryHandler
);

export default router;
