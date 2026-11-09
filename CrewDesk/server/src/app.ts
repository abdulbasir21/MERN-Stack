import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { resetDemoWorkspace } from './lib/resetDemo.js';
import { authRouter } from './modules/auth/routes.js';
import { authenticate } from './middleware/auth.js';
import { requirePermission } from './middleware/requirePermission.js';
import { demoGuard } from './middleware/demoGuard.js';

export const app = express();

/**
 * Trust Proxy Configuration:
 * CrewDesk runs behind two Vercel hops in production:
 * 1. Client Vercel edge rewrite (`crew-desk-client.vercel.app/api/*` -> `crew-desk.vercel.app/api/*`)
 * 2. Server Vercel serverless edge (`crew-desk.vercel.app`)
 * Setting trust proxy to 2 ensures Express and rate limiters resolve the real client IP
 * rather than the intermediate Vercel proxy IP.
 */
app.set('trust proxy', 2);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        env.CLIENT_URL,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ];
      if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '250kb' }));

// Health check endpoint (also verifies DB connectivity)
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      data: {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
    });
  } catch {
    return res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failed',
      },
    });
  }
});

// Internal Vercel Cron / Admin Demo Reset Endpoint (Protected by CRON_SECRET)
const handleResetDemo = async (req: Request, res: Response) => {
  const configuredSecret = env.CRON_SECRET || process.env.CRON_SECRET;
  if (!configuredSecret) {
    return res.status(503).json({
      error: {
        code: 'CRON_SECRET_NOT_CONFIGURED',
        message: 'CRON_SECRET is not configured on the server.',
      },
    });
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = (req.headers['x-cron-secret'] as string | undefined)?.trim() || '';
  const providedSecret = bearerToken || headerToken;

  const expectedBuf = Buffer.from(configuredSecret, 'utf8');
  const providedBuf = Buffer.from(providedSecret, 'utf8');
  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing cron secret.',
      },
    });
  }

  try {
    const summary = await resetDemoWorkspace();
    return res.status(200).json({
      success: true,
      data: {
        message: 'Demo workspace reset successfully.',
        ...summary,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: {
        code: 'DEMO_RESET_FAILED',
        message: err instanceof Error ? err.message : 'Failed to reset demo workspace',
      },
    });
  }
};

app.post('/api/internal/reset-demo', handleResetDemo);
app.get('/api/internal/reset-demo', handleResetDemo);

// Authentication routes
app.use('/api/auth', authRouter);

// Explicit backend guard for any export, upload, or bulk/destructive delete endpoints
app.all(
  ['/api/export', '/api/export/*', '/api/*/export', '/api/uploads', '/api/uploads/*'],
  authenticate,
  demoGuard('BLOCK', {
    actionName: 'export-or-upload:blocked',
    message: 'Data exports and file uploads are disabled in demo mode.',
  }),
  (_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not available.' } });
  }
);

app.delete(
  [
    '/api/users/*',
    '/api/users',
    '/api/projects/*',
    '/api/projects',
    '/api/clients/*',
    '/api/clients',
    '/api/tasks/*',
    '/api/tasks',
    '/api/finance/*',
    '/api/inventory/*',
    '/api/attendance/*',
    '/api/leave/*',
  ],
  authenticate,
  demoGuard('BLOCK', {
    actionName: 'delete:blocked',
    message: 'Deleting records or bulk deletion is disabled in demo mode.',
  })
);

// Domain routes (Users, Departments, Profile, Avatar)
import { apiRouter } from './modules/users/routes.js';
import { projectRouter } from './modules/projects/routes.js';
import { taskRouter } from './modules/tasks/routes.js';
import attendanceRouter from './modules/attendance/routes.js';
import leaveRouter from './modules/leave/routes.js';
import financeRouter from './modules/finance/routes.js';
import inventoryRouter from './modules/inventory/routes.js';
import systemRouter from './modules/system/routes.js';
import dashboardRouter from './modules/dashboard/routes.js';
app.use('/api', apiRouter);
app.use('/api', projectRouter);
app.use('/api', taskRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/finance', financeRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api', systemRouter);
app.use('/api/dashboard', dashboardRouter);

// Example permission-guarded test route for tests & verification
app.get('/api/test/owner-only', authenticate, requirePermission('settings:manage'), (_req: Request, res: Response) => {
  res.status(200).json({ data: { message: 'Access granted to owner route.' } });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isDev = env.NODE_ENV === 'development';

  if (typeof err === 'object' && err !== null && 'status' in err && 'code' in err) {
    const customErr = err as { status: number; code: string; message: string; details?: unknown };
    return res.status(customErr.status).json({
      error: {
        code: customErr.code,
        message: customErr.message,
        details: customErr.details,
      },
    });
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDev ? message : 'An unexpected error occurred',
    },
  });
});

export default app;
