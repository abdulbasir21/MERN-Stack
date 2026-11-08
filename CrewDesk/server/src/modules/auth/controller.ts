import { Request, Response, NextFunction } from 'express';
import { authService } from './service.js';
import { env } from '../../config/env.js';

const isProd = env.NODE_ENV === 'production';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken, refreshToken, user } = await authService.login(req.body);

      // Set httpOnly cookies
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        data: { user },
      });
    } catch (err) {
      return next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken = req.cookies?.refresh_token;
      if (!rawRefreshToken) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'No refresh token provided.' },
        });
      }

      const { accessToken, refreshToken } = await authService.refreshToken(rawRefreshToken);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        data: { message: 'Token refreshed successfully.' },
      });
    } catch (err) {
      return next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken = req.cookies?.refresh_token;
      const userId = req.user?.userId;

      await authService.logout(rawRefreshToken, userId);

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      return res.status(200).json({
        data: { message: 'Logged out successfully.' },
      });
    } catch (err) {
      return next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' },
        });
      }

      const { accessToken, refreshToken } = await authService.changePassword(req.user.userId, req.body);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        data: { message: 'Password updated successfully.' },
      });
    } catch (err) {
      return next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' },
        });
      }

      const user = await authService.getMe(req.user.userId);
      return res.status(200).json({
        data: { user },
      });
    } catch (err) {
      return next(err);
    }
  }
}

export const authController = new AuthController();
