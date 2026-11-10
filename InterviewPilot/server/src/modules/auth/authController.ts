import type { Request, Response, NextFunction, CookieOptions } from 'express';
import { AUTH_COOKIE_NAME } from '../../config/constants.js';
import { AppError } from '../../lib/errors.js';
import {
  checkLoginRateLimit,
  clearFailedLoginAttempts,
  recordFailedLoginAttempt,
} from '../../middleware/rateLimit.js';
import {
  changeUserPassword,
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from './authService.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

export async function handleRegister(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { user, sessionToken } = await registerUser(req.body);
    res.cookie(AUTH_COOKIE_NAME, sessionToken, getSessionCookieOptions());
    res.status(201).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  try {
    checkLoginRateLimit(email, req);
    const { user, sessionToken } = await loginUser(req.body);
    clearFailedLoginAttempts(email, req);
    res.cookie(AUTH_COOKIE_NAME, sessionToken, getSessionCookieOptions());
    res.status(200).json({
      data: { user },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    if (err instanceof AppError && err.code === 'UNAUTHENTICATED') {
      recordFailedLoginAttempt(email, req);
    }
    next(err);
  }
}

export async function handleLogout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    res.status(200).json({
      data: { loggedOut: true },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleMe(
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

export async function handleForgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await requestPasswordReset(req.body);
    res.status(200).json({
      data: {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleResetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await resetPasswordWithToken(req.body);
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    res.status(200).json({
      data: {
        message: 'Your password has been reset. You can now sign in with your new password.',
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }
    const { sessionToken } = await changeUserPassword(req.actor.id, req.body);
    res.cookie(AUTH_COOKIE_NAME, sessionToken, getSessionCookieOptions());
    res.status(200).json({
      data: {
        message: 'Password updated successfully.',
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    next(err);
  }
}
