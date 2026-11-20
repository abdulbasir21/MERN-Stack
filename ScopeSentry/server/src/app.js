import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import projectsRouter from './routes/projects.js';
import { documentsRouter, projectDocumentsRouter } from './routes/documents.js';
import investigationsRouter from './routes/investigations.js';
import findingsRouter from './routes/findings.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';
import demoRouter from './routes/demo.js';
import { notFoundHandler, centralErrorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security Headers
  app.use(helmet());

  const allowedOrigins = (config.clientOrigin || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Strict CORS allowing clientOrigin with credentials
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      if (
        config.env !== 'production' &&
        (normalized === 'http://localhost:5173' || normalized === 'http://127.0.0.1:5173')
      ) {
        return callback(null, true);
      }
      if (/^https:\/\/scopesentry(-[a-z0-9-]+)?\.vercel\.app$/.test(normalized)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key', 'X-Demo-Session-Id']
  }));

  // Body parsers with safe limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Mount API Routes
  app.use(healthRouter);
  app.use('/auth', authRouter);
  app.use('/settings', settingsRouter);
  app.use('/projects', projectsRouter);
  app.use('/projects/:projectId/documents', projectDocumentsRouter);
  app.use('/documents', documentsRouter);
  app.use(investigationsRouter);
  app.use(findingsRouter);
  app.use(reportsRouter);
  app.use(dashboardRouter);
  app.use(demoRouter);

  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/projects/:projectId/documents', projectDocumentsRouter);
  app.use('/api/v1/documents', documentsRouter);
  app.use('/api/v1', investigationsRouter);
  app.use('/api/v1', findingsRouter);
  app.use('/api/v1', reportsRouter);
  app.use('/api/v1', dashboardRouter);
  app.use('/api/v1', demoRouter);

  // Catch-all 404
  app.use(notFoundHandler);

  // Central Error Handler
  app.use(centralErrorHandler);

  return app;
}

export default createApp();
