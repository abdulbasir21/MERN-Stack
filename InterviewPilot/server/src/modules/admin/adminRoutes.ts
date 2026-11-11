import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/permissions.js';
import {
  handleGetAdminOverview,
  handleListAdminUsers,
  handleSetUserStatus,
  handleDeleteUser,
  handleListAdminDocuments,
  handleDownloadDocument,
  handleDeleteDocument,
  handleListAdminInterviews,
  handleViewInterviewAudit,
  handleGetUsageMetrics,
  handleGetSettings,
  handleUpdateSettings,
  handleEmergencyShutdown,
  handleListAuditLogs,
  handleResetDemoData,
} from './adminController.js';

export const adminRouter = Router();

// ADM-1: Strictly require authenticated ADMIN for all admin endpoints
adminRouter.use(authenticate, requireRole('ADMIN'));

// ADM-2: Overview metrics
adminRouter.get('/overview', handleGetAdminOverview);

// ADM-3: Users management
adminRouter.get('/users', handleListAdminUsers);
adminRouter.patch('/users/:id/status', handleSetUserStatus);
adminRouter.delete('/users/:id', handleDeleteUser);

// ADM-4: Documents management & streams (audited in same tx)
adminRouter.get('/documents', handleListAdminDocuments);
adminRouter.get('/documents/:id/download', handleDownloadDocument);
adminRouter.delete('/documents/:id', handleDeleteDocument);

// ADM-5: Interviews management (transcript / report audit)
adminRouter.get('/interviews', handleListAdminInterviews);
adminRouter.get('/interviews/:id/audit', handleViewInterviewAudit);

// ADM-6: Usage aggregates (costs labelled ESTIMATED)
adminRouter.get('/usage', handleGetUsageMetrics);

// ADM-7: Range-validated settings & emergency shutdown
adminRouter.get('/settings', handleGetSettings);
adminRouter.put('/settings', handleUpdateSettings);
adminRouter.post('/settings/emergency-shutdown', handleEmergencyShutdown);

// ADM-8: Audit logs (read-only, paginated)
adminRouter.get('/audit-logs', handleListAuditLogs);

// ADM-9, DEM-6: Reset demo data
adminRouter.post('/demo/reset', handleResetDemoData);
