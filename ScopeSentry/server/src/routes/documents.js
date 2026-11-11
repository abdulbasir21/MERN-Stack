import { Router } from 'express';
import {
  handleUploadDocument,
  handleListDocuments,
  handleGetDocument,
  handleDownloadDocument,
  handleDeleteDocument,
  handleReprocessDocument
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { documentUploadMiddleware } from '../middleware/upload.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

export const projectDocumentsRouter = Router({ mergeParams: true });
projectDocumentsRouter.use(authenticate);

projectDocumentsRouter.get('/', handleListDocuments);
projectDocumentsRouter.post(
  '/',
  uploadRateLimiter,
  csrfProtection,
  documentUploadMiddleware('file'),
  handleUploadDocument
);

export const documentsRouter = Router();
documentsRouter.use(authenticate);

documentsRouter.get('/:id', handleGetDocument);
documentsRouter.get('/:id/download', handleDownloadDocument);
documentsRouter.delete('/:id', csrfProtection, handleDeleteDocument);
documentsRouter.post(
  '/:id/reprocess',
  uploadRateLimiter,
  csrfProtection,
  documentUploadMiddleware('file'),
  handleReprocessDocument
);

export default documentsRouter;
