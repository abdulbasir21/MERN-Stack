import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes, userRoutes } from './modules/auth/auth.routes';
import {
  publicCompanyRoutes,
  companyAdminRoutes,
  adminCompanyRoutes,
} from './modules/companies/company.routes';
import categoryRoutes from './modules/categories/category.routes';
import uploadRoutes from './modules/uploads/upload.routes';
import inquiryRoutes from './modules/inquiries/inquiry.routes';
import quotationRoutes from './modules/quotations/quotation.routes';
import notificationRoutes from './modules/notifications/notification.routes';

export const createApp = (): Express => {
  const app = express();

  // 1. Request ID tracking
  app.use(requestIdMiddleware);

  // 2. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Managed per frontend
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 3. CORS Configuration
  const clientUrlClean = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/+$/, '') : '';
  const allowedOrigins = [clientUrlClean, 'http://localhost:3000'].filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (
          allowedOrigins.includes(cleanOrigin) ||
          cleanOrigin.endsWith('.vercel.app') ||
          env.NODE_ENV === 'development'
        ) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy: origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // 4. Body parser with 100kb limit (Architecture §4.1)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 5. Health Check Route (/api/v1/health & /health)
  const healthHandler = (req: express.Request, res: express.Response) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(200).json({
      status: 'ok',
      db: isDbConnected ? 'up' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'QuotePilot Backend API',
      version: '1.0.0',
    });
  };

  app.get('/api/v1/health', healthHandler);
  app.get('/health', healthHandler);

  // 6. Mount Feature Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/companies', publicCompanyRoutes);
  app.use('/api/v1/company', companyAdminRoutes);
  app.use('/api/v1/admin', adminCompanyRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/uploads', uploadRoutes);
  app.use('/api/v1/inquiries', inquiryRoutes);
  app.use('/api/v1/quotations', quotationRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // 7. 404 & Error Handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
