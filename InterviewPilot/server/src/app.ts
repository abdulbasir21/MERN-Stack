import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { globalRateLimiter } from './middleware/rateLimit.js';
import { authenticate } from './middleware/auth.js';
import { requireRole } from './middleware/permissions.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { AppError } from './lib/errors.js';
import { authRouter } from './modules/auth/authRoutes.js';
import { userRouter } from './modules/users/userRoutes.js';
import { quotaRouter } from './modules/quota/quotaRoutes.js';
import { documentRouter } from './modules/documents/documentRoutes.js';
import { interviewRouter } from './modules/interviews/interviewRoutes.js';
import { voiceRouter } from './modules/voice/voiceRoutes.js';
import { demoRouter } from './modules/demo/demoRoutes.js';

export interface CreateAppOptions {
  allowedOrigin?: string;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const allowedOrigin = options.allowedOrigin || env.CLIENT_ORIGIN;

  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(helmet());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === allowedOrigin) {
          callback(null, true);
          return;
        }
        callback(
          new AppError(
            'CORS_NOT_ALLOWED',
            'Cross-origin request from this origin is not allowed.',
            403
          )
        );
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(globalRateLimiter);
  app.use(csrfMiddleware);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
        service: 'interviewpilot-api',
        timestamp: new Date().toISOString(),
      },
      meta: {
        requestId: _req.requestId,
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/quota', quotaRouter);
  app.use('/api/documents', documentRouter);
  app.use('/api/interviews', interviewRouter);
  app.use('/api/voice', voiceRouter);
  app.use('/api/demo', demoRouter);

  // Admin role check endpoint (ADM-1, SEC-1)
  app.get(
    '/api/admin/access-check',
    authenticate,
    requireRole('ADMIN'),
    (req, res) => {
      res.status(200).json({
        data: {
          allowed: true,
          role: req.actor?.role,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    }
  );

  // Test-only error simulation route when running automated tests
  if (process.env.NODE_ENV === 'test') {
    app.get('/api/__test/unhandled-error', (_req, _res, next) => {
      const internalErr = new Error(
        'SELECT * FROM users WHERE secret_key = "SUPER_SECRET_LEAK" FAILED'
      );
      next(internalErr);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
