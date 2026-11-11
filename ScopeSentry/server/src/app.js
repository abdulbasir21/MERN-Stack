import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import projectsRouter from './routes/projects.js';
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

  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/projects', projectsRouter);

  // Catch-all 404
  app.use(notFoundHandler);

  // Central Error Handler
  app.use(centralErrorHandler);

  return app;
}

export default createApp();
