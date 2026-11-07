import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/auth';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      jwtPayload?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication token is required.'));
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await User.findById(payload.sub).select('+status +role +companyId');
    if (!user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'The user belonging to this token no longer exists.'));
    }

    if (user.status === 'blocked') {
      return next(
        new AppError(403, 'ACCOUNT_BLOCKED', 'Your account has been permanently suspended.')
      );
    }

    req.user = user;
    req.jwtPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
};
