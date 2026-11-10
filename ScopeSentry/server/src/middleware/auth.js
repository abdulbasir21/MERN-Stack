import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { ERROR_CODES, PERMISSIONS } from '../config/constants.js';

// Role-to-Permissions Mapping (Source: MASTER_PROMPT section 5 & ARCHITECTURE section 7)
export const ROLE_PERMISSIONS = {
  visitor: [
    PERMISSIONS.DEMO_READ,
    PERMISSIONS.DEMO_RUN
  ],
  user: [
    PERMISSIONS.DEMO_READ,
    PERMISSIONS.DEMO_RUN,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ_OWN,
    PERMISSIONS.PROJECT_UPDATE_OWN,
    PERMISSIONS.PROJECT_DELETE_OWN,
    PERMISSIONS.DOCUMENT_UPLOAD_OWN,
    PERMISSIONS.DOCUMENT_READ_OWN,
    PERMISSIONS.DOCUMENT_DELETE_OWN,
    PERMISSIONS.INVESTIGATION_CREATE_OWN,
    PERMISSIONS.INVESTIGATION_READ_OWN,
    PERMISSIONS.INVESTIGATION_DELETE_OWN,
    PERMISSIONS.FINDING_REVIEW_OWN,
    PERMISSIONS.REPORT_CREATE_OWN,
    PERMISSIONS.REPORT_READ_OWN,
    PERMISSIONS.DASHBOARD_READ_OWN,
    PERMISSIONS.SETTINGS_UPDATE_OWN
  ]
};

export function authenticate(req, res, next) {
  const token = req.cookies?.scopesentry_session ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return next(new AppError(ERROR_CODES.UNAUTHENTICATED, 'Authentication required', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    next();
  } catch {
    next(new AppError(ERROR_CODES.UNAUTHENTICATED, 'Invalid or expired session', 401));
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user ? req.user.role : 'visitor';
    const allowedPermissions = ROLE_PERMISSIONS[userRole] || [];

    if (!allowedPermissions.includes(permission)) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'Insufficient permissions', 403));
    }
    next();
  };
}
