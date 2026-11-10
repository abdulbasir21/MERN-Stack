import type { Request, Response, NextFunction } from 'express';
import { PermissionEnum, type Permission, type UserRole } from '@interviewpilot/shared';
import type { AuthenticatedActor } from './auth.js';
import { AppError } from '../lib/errors.js';

const USER_PERMISSIONS: ReadonlySet<Permission> = new Set([
  'profile:read:own',
  'profile:update:own',
  'document:create',
  'document:read:own',
  'document:delete:own',
  'interview:create',
  'interview:read:own',
  'interview:delete:own',
  'report:read:own',
]);

const DEMO_PERMISSIONS: ReadonlySet<Permission> = new Set([
  'profile:read:own',
  'interview:create',
  'interview:read:own',
  'interview:delete:own',
  'report:read:own',
]);

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set(PermissionEnum.options);

export function getPermissionsForActor(actor: AuthenticatedActor): ReadonlySet<Permission> {
  if (actor.role === 'ADMIN') {
    return ADMIN_PERMISSIONS;
  }
  if (actor.isDemo) {
    return DEMO_PERMISSIONS;
  }
  return USER_PERMISSIONS;
}

export function hasPermission(actor: AuthenticatedActor, permission: Permission): boolean {
  return getPermissionsForActor(actor).has(permission);
}

export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      next(new AppError('UNAUTHENTICATED', 'Authentication required.', 401));
      return;
    }

    const actorPermissions = getPermissionsForActor(actor);
    for (const perm of requiredPermissions) {
      if (!actorPermissions.has(perm)) {
        if (actor.isDemo && (perm.startsWith('document:') || perm === 'profile:update:own')) {
          next(
            new AppError(
              'DEMO_RESTRICTED',
              'This action is not available in demo mode.',
              403
            )
          );
          return;
        }
        next(
          new AppError(
            'FORBIDDEN',
            'You do not have permission to perform this action.',
            403
          )
        );
        return;
      }
    }

    next();
  };
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      next(new AppError('UNAUTHENTICATED', 'Authentication required.', 401));
      return;
    }

    if (!allowedRoles.includes(actor.role)) {
      next(
        new AppError(
          'FORBIDDEN',
          'You do not have permission to access this resource.',
          403
        )
      );
      return;
    }

    next();
  };
}
