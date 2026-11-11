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

  // Security Headers
  app.use(helmet());

  // Strict CORS allowing clientOrigin with credentials
  app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key']
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
