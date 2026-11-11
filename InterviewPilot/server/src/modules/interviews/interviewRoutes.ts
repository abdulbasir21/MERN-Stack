import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { validateRequest } from '../../middleware/validate.js';
import { CreateInterviewInputSchema } from '@interviewpilot/shared';
import {
  handleCreateInterview,
  handleGetInterview,
  handleListInterviews,
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
