import { Router } from 'express';
import { UploadController } from './upload.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// GET /api/v1/uploads/imagekit-auth (requires authentication)
router.get('/imagekit-auth', authenticate, UploadController.getAuthParams);

// POST /api/v1/uploads/image (direct server-side ImageKit upload)
router.post('/image', authenticate, UploadController.uploadDirect);

export default router;
