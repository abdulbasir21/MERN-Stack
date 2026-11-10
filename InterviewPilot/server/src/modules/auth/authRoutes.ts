import { Router } from 'express';
import {
  ChangePasswordInputSchema,
  ForgotPasswordInputSchema,
  LoginInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
} from '@interviewpilot/shared';
import { authenticate, requireAnonymous } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  handleChangePassword,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleMe,
  handleRegister,
  handleResetPassword,
} from './authController.js';

export const authRouter = Router();

// SEC-1 order: authenticate/anonymous check -> permission check -> validate input -> act
authRouter.post(
  '/register',
  requireAnonymous,
  validateRequest({ body: RegisterInputSchema }),
  handleRegister
);

authRouter.post(
  '/login',
  requireAnonymous,
  validateRequest({ body: LoginInputSchema }),
  handleLogin
);

authRouter.post('/logout', handleLogout);

authRouter.get(
  '/me',
  authenticate,
  requirePermission('profile:read:own'),
  handleMe
);

authRouter.post(
  '/forgot-password',
  requireAnonymous,
  validateRequest({ body: ForgotPasswordInputSchema }),
  handleForgotPassword
);

authRouter.post(
  '/reset-password',
  requireAnonymous,
  validateRequest({ body: ResetPasswordInputSchema }),
  handleResetPassword
);

authRouter.post(
  '/change-password',
  authenticate,
  requirePermission('profile:update:own'),
  validateRequest({ body: ChangePasswordInputSchema }),
  handleChangePassword
);
