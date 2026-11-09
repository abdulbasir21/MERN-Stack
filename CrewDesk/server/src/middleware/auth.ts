import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../lib/token.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedUser extends TokenPayload {
  name: string;
  isDemo: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No access token provided.',
      },
    });
  }

  try {
    const payload = verifyAccessToken(token);

    // Verify user exists and is active in DB (always load role and isDemo from DB, never trust token/request)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        isDemo: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account is deactivated or does not exist.',
        },
      });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      isDemo: user.isDemo,
    };

    // mustChangePassword enforcement on server
    // Allowed endpoints when mustChangePassword is true: change-password, logout, me
    if (user.mustChangePassword) {
      const allowedPaths = ['/api/auth/change-password', '/api/auth/logout', '/api/auth/me'];
      if (!allowedPaths.includes(req.baseUrl + req.path) && !allowedPaths.includes(req.originalUrl.split('?')[0])) {
        return res.status(403).json({
          error: {
            code: 'PASSWORD_CHANGE_REQUIRED',
            message: 'You must change your temporary password before accessing the system.',
          },
        });
      }
    }

    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token.',
      },
    });
  }
}
