import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './modules/auth/routes.js';
import { authenticate } from './middleware/auth.js';
import { requirePermission } from './middleware/requirePermission.js';

export const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

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

// Authentication routes
app.use('/api/auth', authRouter);

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
