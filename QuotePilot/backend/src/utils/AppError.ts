export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_BLOCKED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'INCOMPLETE_BRIEF';

export interface ValidationErrorDetail {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ValidationErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: ValidationErrorDetail[]): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static accountBlocked(message = 'Your account has been suspended'): AppError {
    return new AppError(403, 'ACCOUNT_BLOCKED', message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static rateLimited(message = 'Too many requests, please try again later'): AppError {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'An unexpected error occurred'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
