import { Router } from 'express';
import { z } from 'zod';
import { getSettings, updateSettings } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const updateSettingsSchema = {
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(10).max(128).optional()
  })
};

router.use(authenticate);

router.get('/', getSettings);
router.patch('/', csrfProtection, validate(updateSettingsSchema), updateSettings);

export default router;
