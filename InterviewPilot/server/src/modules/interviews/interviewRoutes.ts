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
import {
  getInterviewReportHandler,
  generateInterviewReportHandler,
  getInterviewHistoryHandler,
  getProgressHandler,
  compareInterviewsHandler,
} from '../reports/reportController.js';

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

// Phase 10: History, Progress & Comparison (registered BEFORE /:id)
interviewRouter.get(
  '/history',
  authenticate,
  requirePermission('interview:read:own'),
  getInterviewHistoryHandler
);

interviewRouter.get(
  '/progress',
  authenticate,
  requirePermission('interview:read:own'),
  getProgressHandler
);

interviewRouter.get(
  '/compare',
  authenticate,
  requirePermission('interview:read:own'),
  compareInterviewsHandler
);

// Specific interview by ID
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

// Phase 10: Comprehensive Report Endpoints (RPT-1 to RPT-5)
interviewRouter.get(
  '/:id/report',
  authenticate,
  requirePermission('interview:read:own'),
  getInterviewReportHandler
);

interviewRouter.post(
  '/:id/report/generate',
  authenticate,
  requirePermission('interview:create'),
  generateInterviewReportHandler
);
