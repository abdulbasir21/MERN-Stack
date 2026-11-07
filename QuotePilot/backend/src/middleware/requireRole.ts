import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../config/constants';
import { AppError } from '../utils/AppError';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'You must be logged in to perform this action.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'You do not have permission to perform this action.'
        )
      );
    }

    next();
  };
};
