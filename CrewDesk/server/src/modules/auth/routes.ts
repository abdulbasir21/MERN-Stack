import { Router } from 'express';
import { authController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { demoGuard } from '../../middleware/demoGuard.js';
import { validate } from '../../middleware/validate.js';
import { loginRateLimiter } from '../../middleware/rateLimit.js';
import { loginSchema, changePasswordSchema } from './schemas.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

authRouter.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

authRouter.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

authRouter.post(
  '/change-password',
  authenticate,
  demoGuard('BLOCK', {
    actionName: 'auth:change-password',
    message: 'Changing the shared demo account password is not permitted.',
  }),
  validate(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);

authRouter.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));
