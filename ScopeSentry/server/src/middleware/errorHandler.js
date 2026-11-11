import { ERROR_CODES } from '../config/constants.js';

export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: 'Resource not found'
    }
  });
}

export function centralErrorHandler(err, req, res, next) {
  // Determine status code and error code
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || ERROR_CODES.INTERNAL_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || undefined;

  // Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = Object.keys(err.errors || {}).map(field => ({
      field,
      message: err.errors[field].message
    }));
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = ERROR_CODES.CONFLICT;
    message = 'A resource with this identifier already exists';
    details = undefined;
  }

  // Never expose raw internal messages or stack traces on 500 in production
  if (statusCode === 500) {
    code = ERROR_CODES.INTERNAL_ERROR;
    message = 'Internal server error';
    details = undefined;
  }

  const responseBody = {
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };

  res.status(statusCode).json(responseBody);
}
