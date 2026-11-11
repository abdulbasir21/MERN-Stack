import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  generateReportHandler,
  getReportDownloadUrlHandler,
  listProjectReportsHandler
} from '../controllers/reportController.js';

const router = express.Router();

router.post(
  '/investigations/:id/reports',
  authenticate,
  csrfProtection,
  generateReportHandler
);

router.get(
  '/reports/:id/download',
  authenticate,
  getReportDownloadUrlHandler
);

router.get(
  '/projects/:projectId/reports',
  authenticate,
  listProjectReportsHandler
);

export default router;
