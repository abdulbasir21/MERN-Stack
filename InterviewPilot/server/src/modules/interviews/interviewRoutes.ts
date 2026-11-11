import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  CreateInterviewInputSchema,
  SubmitAnswerInputSchema,
  SubmitInquiryInputSchema,
} from '@interviewpilot/shared';
import {
  handleCreateInterview,
  handleGetInterview,
  handleListInterviews,
  handleStartInterview,
  handleSubmitAnswer,
  handleSubmitInquiry,
  handleEndInterview,
  handleRetryInterview,
  handleGetInterviewState,
} from './interviewController.js';

export const interviewRouter = Router();

// Order: authenticate -> permission check -> scope check -> validate input -> act
interviewRouter.post(
  '/',
  authenticate,
  requirePermission('interview:create'),
  validateRequest({ body: CreateInterviewInputSchema }),
  handleCreateInterview
);

interviewRouter.get(
  '/',
  authenticate,
  requirePermission('interview:read:own'),
  handleListInterviews
);

interviewRouter.get(
  '/:id',
  authenticate,
  requirePermission('interview:read:own'),
  handleGetInterview
);

// Phase 7 Engine Routes (ENG-1 to ENG-10)
interviewRouter.post(
  '/:id/start',
  authenticate,
  requirePermission('interview:create'),
  handleStartInterview
);

interviewRouter.get(
  '/:id/state',
  authenticate,
  requirePermission('interview:read:own'),
  handleGetInterviewState
);

interviewRouter.post(
  '/:id/answer',
  authenticate,
  requirePermission('interview:create'),
  validateRequest({ body: SubmitAnswerInputSchema }),
  handleSubmitAnswer
);

interviewRouter.post(
  '/:id/inquiry',
  authenticate,
  requirePermission('interview:create'),
  validateRequest({ body: SubmitInquiryInputSchema }),
  handleSubmitInquiry
);

interviewRouter.post(
  '/:id/end',
  authenticate,
  requirePermission('interview:create'),
  handleEndInterview
);

interviewRouter.post(
  '/:id/retry',
  authenticate,
  requirePermission('interview:create'),
  handleRetryInterview
);

