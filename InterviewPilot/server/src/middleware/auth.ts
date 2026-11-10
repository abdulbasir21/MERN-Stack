import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole, UserStatus } from '@interviewpilot/shared';
import { env } from '../config/env.js';
import { AUTH_COOKIE_NAME } from '../config/constants.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../lib/errors.js';

export interface AuthenticatedActor {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isDemo: boolean;
  tokenVersion: number;
}

export interface JwtTokenPayload {
  userId: string;
  tokenVersion: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: AuthenticatedActor;
    }
  }
}

export function signSessionToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifySessionToken(token: string): JwtTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (
      typeof decoded !== 'object' ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.tokenVersion !== 'number'
    ) {
      throw new AppError('UNAUTHENTICATED', 'Invalid authentication token.', 401);
    }
    return {
      userId: decoded.userId,
      tokenVersion: decoded.tokenVersion,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('UNAUTHENTICATED', 'Authentication required or session expired.', 401);
  }
}

/**
 * SEC-1, AUTH-3, AUTH-4, AUTH-5:
 * Verifies JWT from httpOnly cookie and loads user role, status, and tokenVersion
 * directly from the database on EVERY request.
 */
export async function authenticate(
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

    if (user.status === 'BLOCKED' || user.status === 'DELETING') {
      throw new AppError(
        'ACCOUNT_BLOCKED',
        'Your account is blocked or scheduled for deletion.',
        403
      );
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

/**
 * Permission Matrix §5:
 * Register / login / reset password routes are allowed for Anonymous only.
 * Logged-in users (Demo visitor, USER, ADMIN) receive 403 FORBIDDEN.
 */
export async function requireAnonymous(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token || typeof token !== 'string') {
      next();
      return;
    }

    try {
      const payload = verifySessionToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, status: true, tokenVersion: true },
      });
      if (user && user.status === 'ACTIVE' && user.tokenVersion === payload.tokenVersion) {
        throw new AppError(
          'FORBIDDEN',
          'Already authenticated. Log out first to perform this action.',
          403
        );
      }
    } catch (innerErr) {
      if (innerErr instanceof AppError && innerErr.code === 'FORBIDDEN') {
        throw innerErr;
      }
      // Invalid or expired token is treated as anonymous
    }

    next();
  } catch (err) {
    next(err);
  }
}
