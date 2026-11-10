import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME } from '../../config/constants.js';
import { AppError } from '../../lib/errors.js';
import { getCurrentUser } from '../auth/authService.js';
import {
  completeUserOnboarding,
  deleteOwnUserAccount,
  getScopedUserProfile,
  MVP_PRIVACY_CONTROLS,
  skipUserOnboarding,
  updateOwnProfile,
} from './userService.js';

export async function handleCompleteOnboarding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    const user = await completeUserOnboarding(req.actor.id, req.body);
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleSkipOnboarding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    const user = await skipUserOnboarding(req.actor.id);
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMeProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    const user = await getCurrentUser(req.actor.id);
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateMeProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    const user = await updateOwnProfile(req.actor.id, req.body);
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetUserByIdProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    const user = await getScopedUserProfile(req.actor.id, String(req.params.id || ''));
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateUserByIdProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    if (req.actor.id !== String(req.params.id || '')) {
      throw new AppError('NOT_FOUND', 'User profile not found.', 404);
    }
    const user = await updateOwnProfile(req.actor.id, req.body);
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetPrivacyControls(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json({
      data: {
        controls: MVP_PRIVACY_CONTROLS,
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteMyAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    await deleteOwnUserAccount(req.actor.id, req.body);
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    res.status(200).json({
      data: { deleted: true },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}
