import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', 'The requested resource was not found.', 404));
}

/**
 * Central error handler enforcing SEC-6 & SEC-8:
 * Never exposes stack traces, keys, SQL, or raw provider messages.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';
  res.setHeader('X-Request-Id', requestId);

  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, statusCode: err.statusCode }, 'Request error');
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const pathKey = issue.path.join('.') || '_root';
      if (!fieldErrors[pathKey]) {
        fieldErrors[pathKey] = [];
      }
      fieldErrors[pathKey].push(issue.message);
    }
    logger.warn({ requestId, code: 'VALIDATION_ERROR' }, 'Validation error');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input.',
        details: { fields: fieldErrors },
      },
    });
    return;
  }

  logger.error({ requestId, code: 'INTERNAL_ERROR' }, 'Unhandled internal server error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred.',
    },
  });
}
