import express from 'express';
import { demoRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  getDemoProjectsHandler,
  getDemoProjectByIdHandler,
  getDemoProjectDocumentsHandler,
  getDemoDocumentByIdHandler,
  runDemoInvestigationHandler,
  runDemoInvestigationSchema,
  getDemoInvestigationFindingsHandler
} from '../controllers/demoController.js';

const router = express.Router();

// Public Demo project & document routes
router.get('/demo/projects', getDemoProjectsHandler);
router.get('/demo/projects/:id', getDemoProjectByIdHandler);
router.get('/demo/projects/:projectId/documents', getDemoProjectDocumentsHandler);
router.get('/demo/documents/:id', getDemoDocumentByIdHandler);

// Public Demo investigation runner (rate limited)
router.post(
  '/demo/investigations',
  demoRateLimiter,
  validate(runDemoInvestigationSchema, 'body'),
  runDemoInvestigationHandler
);

router.get('/demo/investigations/:id/findings', getDemoInvestigationFindingsHandler);

export default router;
