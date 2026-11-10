import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';
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

  // Health routes (root and versioned)
  app.use(healthRouter);
  app.use('/api/v1', healthRouter);

  // Catch-all 404
  app.use(notFoundHandler);

  // Central Error Handler
  app.use(centralErrorHandler);

  return app;
}

export default createApp();
