import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { investigationRateLimiter } from '../middleware/rateLimit.js';
import {
  createInvestigationHandler,
  createInvestigationSchema,
  getInvestigationHandler,
  listProjectInvestigationsHandler,
  getInvestigationFindingsHandler,
  deleteInvestigationHandler
} from '../controllers/investigationController.js';

const router = express.Router();

// Project-scoped investigation routes
router.post(
  '/projects/:projectId/investigations',
  authenticate,
  investigationRateLimiter,
  csrfProtection,
  validate(createInvestigationSchema, 'body'),
  createInvestigationHandler
);

router.get(
  '/projects/:projectId/investigations',
  authenticate,
  listProjectInvestigationsHandler
);

// Individual investigation routes
router.get(
  '/investigations/:id',
  authenticate,
  getInvestigationHandler
);

router.get(
  '/investigations/:id/findings',
  authenticate,
  getInvestigationFindingsHandler
);

router.delete(
  '/investigations/:id',
  authenticate,
  csrfProtection,
  deleteInvestigationHandler
);

export default router;
