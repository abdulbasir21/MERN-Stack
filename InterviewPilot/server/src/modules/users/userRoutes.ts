import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  DeleteAccountInputSchema,
  OnboardingInputSchema,
  UpdateProfileInputSchema,
} from '@interviewpilot/shared';
import { AUTH_COOKIE_NAME } from '../../config/constants.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { authenticate, verifySessionToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  handleCompleteOnboarding,
  handleDeleteMyAccount,
  handleGetMeProfile,
  handleGetPrivacyControls,
  handleGetUserByIdProfile,
  handleSkipOnboarding,
  handleUpdateMeProfile,
  handleUpdateUserByIdProfile,
} from './userController.js';
import { getUserDashboardHandler } from './userDashboardController.js';

export const userRouter = Router();

/**
 * Special auth middleware exclusivamente for account deletion retry (USR-3):
 * Allows an ACTIVE or DELETING user (whose step 2 storage cleanup previously failed)
 * to retry deleting their own account, while BLOCKED users remain rejected.
 */
async function authenticateForAccountDeletion(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token || typeof token !== 'string') {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const payload = verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isDemo: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    if (user.status === 'BLOCKED') {
      throw new AppError('ACCOUNT_BLOCKED', 'Your account is blocked.', 403);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new AppError(
        'UNAUTHENTICATED',
        'Session has been invalidated. Please sign in again.',
        401
      );
    }

    req.actor = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      isDemo: user.isDemo,
      tokenVersion: user.tokenVersion,
    };
    next();
  } catch (err) {
    next(err);
  }
}

userRouter.post(
  '/me/onboarding',
  authenticate,
  requirePermission('profile:update:own'),
  validateRequest({ body: OnboardingInputSchema }),
  handleCompleteOnboarding
);

userRouter.post(
  '/me/onboarding/skip',
  authenticate,
  requirePermission('profile:update:own'),
  handleSkipOnboarding
);

userRouter.get(
  '/me/profile',
  authenticate,
  requirePermission('profile:read:own'),
  handleGetMeProfile
);

userRouter.get(
  '/me/dashboard',
  authenticate,
  getUserDashboardHandler
);

userRouter.get(
  '/dashboard',
  authenticate,
  getUserDashboardHandler
);

userRouter.put(
  '/me/profile',
  authenticate,
  requirePermission('profile:update:own'),
  validateRequest({ body: UpdateProfileInputSchema }),
  handleUpdateMeProfile
);

userRouter.get(
  '/me/privacy-controls',
  authenticate,
  requirePermission('profile:read:own'),
  handleGetPrivacyControls
);

userRouter.post(
  '/me/delete-account',
  authenticateForAccountDeletion,
  requirePermission('profile:update:own'),
  validateRequest({ body: DeleteAccountInputSchema }),
  handleDeleteMyAccount
);

userRouter.get(
  '/:id/profile',
  authenticate,
  requirePermission('profile:read:own'),
  handleGetUserByIdProfile
);

userRouter.put(
  '/:id/profile',
  authenticate,
  requirePermission('profile:update:own'),
  validateRequest({ body: UpdateProfileInputSchema }),
  handleUpdateUserByIdProfile
);
