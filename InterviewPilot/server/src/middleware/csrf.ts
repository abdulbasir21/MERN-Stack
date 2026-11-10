import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const requestedWith = req.header('x-requested-with');
  if (!requestedWith || requestedWith !== 'InterviewPilot') {
    next(
      new AppError(
        'CSRF_INVALID',
        'Missing or invalid CSRF protection header (X-Requested-With).',
        403
      )
    );
    return;
  }

  next();
}
