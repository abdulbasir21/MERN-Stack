import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { registerCustomerSchema, loginSchema, updateUserSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimit';

const router = Router();

// Public Auth Endpoints
router.post('/register', authRateLimiter, validateBody(registerCustomerSchema), AuthController.registerCustomer);
router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

// User Profile Endpoints
export const userRoutes = Router();
userRoutes.patch('/me', authenticate, validateBody(updateUserSchema), AuthController.updateMe);

export const authRoutes = router;
