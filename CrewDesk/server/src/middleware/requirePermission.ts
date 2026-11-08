import { Request, Response, NextFunction } from 'express';
import { Permission, hasPermission } from '../permissions/permissions.js';

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before checking permissions.',
        },
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Missing required permission: ${permission}`,
        },
      });
    }

    return next();
  };
}
