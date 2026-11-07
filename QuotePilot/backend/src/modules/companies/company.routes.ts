import { Router } from 'express';
import { CompanyController } from './company.controller';
import { ServiceController } from '../services/service.controller';
import { ReviewController } from '../reviews/review.controller';
import { validateBody } from '../../middleware/validate';
import {
  registerCompanySchema,
  updateCompanyProfileSchema,
  rejectCompanySchema,
  blockCompanySchema,
} from './company.schema';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { authRateLimiter } from '../../middleware/rateLimit';

// Public Company Registration & Marketplace Discovery
export const publicCompanyRoutes = Router();
publicCompanyRoutes.post(
  '/register',
  authRateLimiter,
  validateBody(registerCompanySchema),
  CompanyController.registerCompany
);
publicCompanyRoutes.get('/', CompanyController.searchCompanies);
publicCompanyRoutes.get('/:slug', CompanyController.getPublicCompanyProfile);
publicCompanyRoutes.get('/:slug/services', CompanyController.getPublicCompanyServices);
publicCompanyRoutes.get('/:slug/reviews', ReviewController.getPublicCompanyReviews);

// Company Admin Personal Company Desk
export const companyAdminRoutes = Router();
companyAdminRoutes.get('/me', authenticate, requireRole('company_admin'), CompanyController.getOwnCompany);
companyAdminRoutes.patch(
  '/me',
  authenticate,
  requireRole('company_admin'),
  validateBody(updateCompanyProfileSchema),
  CompanyController.updateOwnCompany
);
companyAdminRoutes.post(
  '/me/resubmit',
  authenticate,
  requireRole('company_admin'),
  CompanyController.resubmitOwnCompany
);

// Services (FR-PROF-001, FR-PROF-002)
companyAdminRoutes.get('/services', authenticate, requireRole('company_admin'), ServiceController.listServices);
companyAdminRoutes.post('/services', authenticate, requireRole('company_admin'), ServiceController.createService);
companyAdminRoutes.get('/services/:id', authenticate, requireRole('company_admin'), ServiceController.getService);
companyAdminRoutes.patch('/services/:id', authenticate, requireRole('company_admin'), ServiceController.updateService);
companyAdminRoutes.delete('/services/:id', authenticate, requireRole('company_admin'), ServiceController.deleteService);

// Portfolio (FR-PROF-003, FR-PROF-004)
companyAdminRoutes.post('/portfolio', authenticate, requireRole('company_admin'), ServiceController.addPortfolio);
companyAdminRoutes.patch('/portfolio/:itemId', authenticate, requireRole('company_admin'), ServiceController.updatePortfolio);
companyAdminRoutes.delete('/portfolio/:itemId', authenticate, requireRole('company_admin'), ServiceController.deletePortfolio);

// Reviews (FR-REV-001, FR-REV-005)
companyAdminRoutes.get('/reviews', authenticate, requireRole('company_admin'), ReviewController.getCompanyOwnReviews);

// Platform Admin Management Routes
export const adminCompanyRoutes = Router();
adminCompanyRoutes.get(
  '/companies',
  authenticate,
  requireRole('platform_admin'),
  CompanyController.listApplications
);
adminCompanyRoutes.get(
  '/companies/:id',
  authenticate,
  requireRole('platform_admin'),
  CompanyController.getApplicationById
);
adminCompanyRoutes.post(
  '/companies/:id/approve',
  authenticate,
  requireRole('platform_admin'),
  CompanyController.approveCompany
);
adminCompanyRoutes.post(
  '/companies/:id/reject',
  authenticate,
  requireRole('platform_admin'),
  validateBody(rejectCompanySchema),
  CompanyController.rejectCompany
);
adminCompanyRoutes.post(
  '/companies/:id/block',
  authenticate,
  requireRole('platform_admin'),
  validateBody(blockCompanySchema),
  CompanyController.blockCompany
);
