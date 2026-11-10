import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { PasteJdInputSchema } from '@interviewpilot/shared';
import { MAX_DOCUMENT_SIZE_BYTES } from '../../config/constants.js';
import { AppError } from '../../lib/errors.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  handleDeleteDocument,
  handleGetDocumentById,
  handleGetDocumentContent,
  handleListDocuments,
  handlePasteJdDocument,
  handleUploadDocument,
} from './documentController.js';

export const documentRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES, // 5 MB (DOC-2)
  },
});

function handleMulterUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        next(
          new AppError(
            'INVALID_FILE',
            'File size exceeds the 5 MB maximum limit.',
            400
          )
        );
        return;
      }
      next(new AppError('INVALID_FILE', `Upload error: ${err.message}`, 400));
      return;
    }
    next();
  });
}

documentRouter.post(
  '/upload',
  authenticate,
  requirePermission('document:create'),
  handleMulterUpload,
  handleUploadDocument
);

documentRouter.post(
  '/paste-jd',
  authenticate,
  requirePermission('document:create'),
  validateRequest({ body: PasteJdInputSchema }),
  handlePasteJdDocument
);

documentRouter.get(
  '/',
  authenticate,
  requirePermission('document:read:own'),
  handleListDocuments
);

documentRouter.get(
  '/:id',
  authenticate,
  requirePermission('document:read:own'),
  handleGetDocumentById
);

documentRouter.get(
  '/:id/content',
  authenticate,
  requirePermission('document:read:own'),
  handleGetDocumentContent
);

documentRouter.delete(
  '/:id',
  authenticate,
  requirePermission('document:delete:own'),
  handleDeleteDocument
);
