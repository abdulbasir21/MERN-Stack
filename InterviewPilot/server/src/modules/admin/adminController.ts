import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors.js';
import {
  getAdminOverviewMetrics,
  listAdminUsers,
  setUserBlockStatus,
  deleteUserByAdmin,
  listAdminDocuments,
  previewOrDownloadDocumentByAdmin,
  deleteDocumentByAdmin,
  listAdminInterviews,
  viewInterviewTranscriptOrReportByAdmin,
  getAdminUsageAggregates,
  getAdminSettings,
  updateAdminSettings,
  triggerEmergencyAiShutdown,
  listAdminAuditLogs,
  resetAllDemoData,
} from './adminService.js';

function getAdminActorId(req: Request): string {
  if (!req.actor || req.actor.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Administrator access required.', 403);
  }
  return req.actor.id;
}

export async function handleGetAdminOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const metrics = await getAdminOverviewMetrics();
    res.status(200).json({ data: metrics, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleListAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const role = req.query.role ? String(req.query.role) : undefined;
    const isDemo = req.query.isDemo !== undefined ? req.query.isDemo === 'true' : undefined;

    const result = await listAdminUsers({ page, pageSize, search, status, role, isDemo });
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleSetUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const targetUserId = String(req.params.id);
    const { block } = req.body;

    if (typeof block !== 'boolean') {
      throw new AppError('INVALID_INPUT', 'Field "block" must be a boolean.', 400);
    }

    const result = await setUserBlockStatus(adminId, targetUserId, block);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const targetUserId = String(req.params.id);

    const result = await deleteUserByAdmin(adminId, targetUserId);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleListAdminDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;

    const result = await listAdminDocuments({ page, pageSize, search, type });
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleDownloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const documentId = String(req.params.id);
    const isDownload = req.query.download === 'true';

    const { filename, mimeType, data } = await previewOrDownloadDocumentByAdmin(
      adminId,
      documentId,
      isDownload ? 'DOCUMENT_DOWNLOADED' : 'DOCUMENT_PREVIEWED'
    );

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename || 'document')}"`
    );
    res.status(200).send(data);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const documentId = String(req.params.id);

    const result = await deleteDocumentByAdmin(adminId, documentId);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleListAdminInterviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;

    const result = await listAdminInterviews({ page, pageSize, search, status });
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleViewInterviewAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const interviewId = String(req.params.id);

    const result = await viewInterviewTranscriptOrReportByAdmin(adminId, interviewId);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleGetUsageMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const metrics = await getAdminUsageAggregates();
    res.status(200).json({ data: metrics, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleGetSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const result = await getAdminSettings();
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      throw new AppError('INVALID_INPUT', 'Settings payload must be an object.', 400);
    }

    const result = await updateAdminSettings(adminId, updates);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleEmergencyShutdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const result = await triggerEmergencyAiShutdown(adminId);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleListAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    getAdminActorId(req);
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 20;
    const action = req.query.action ? String(req.query.action) : undefined;
    const targetType = req.query.targetType ? String(req.query.targetType) : undefined;

    const result = await listAdminAuditLogs({ page, pageSize, action, targetType });
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}

export async function handleResetDemoData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminActorId(req);
    const result = await resetAllDemoData(adminId);
    res.status(200).json({ data: result, meta: { requestId: req.requestId } });
  } catch (err) {
    next(err);
  }
}
