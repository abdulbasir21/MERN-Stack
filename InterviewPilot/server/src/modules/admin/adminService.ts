import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { recordAdminAudit } from '../../services/audit/auditService.js';
import { getStorageAdapter } from '../../services/storage/imagekitAdapter.js';
import { calculateOverallScore } from '@interviewpilot/shared';

export interface AdminOverviewMetrics {
  totalRegisteredUsers: number;
  activeUsers7d: number;
  activeDemoSessions: number;
  interviews: {
    realTotal: number;
    realToday: number;
    demoTotal: number;
    demoToday: number;
  };
  uploadedDocumentsTotal: number;
  budget: {
    period: string;
    totalBudgetUsd: string;
    usedUsd: string;
    reservedUsd: string;
    remainingUsd: string;
    aiEnabled: boolean;
  };
}

/**
 * ADM-2, Section 7: Admin overview metrics calculated dynamically from database rows.
 */
export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  const [
    totalRegisteredUsers,
    activeUsers7d,
    activeDemoSessions,
    realTotal,
    realToday,
    demoTotal,
    demoToday,
    uploadedDocumentsTotal,
  ] = await Promise.all([
    prisma.user.count({ where: { isDemo: false } }),
    prisma.user.count({ where: { isDemo: false, lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.demoSession.count({ where: { expiresAt: { gte: now } } }),
    prisma.interview.count({ where: { user: { isDemo: false } } }),
    prisma.interview.count({ where: { user: { isDemo: false }, createdAt: { gte: startOfTodayUtc } } }),
    prisma.interview.count({ where: { user: { isDemo: true } } }),
    prisma.interview.count({ where: { user: { isDemo: true }, createdAt: { gte: startOfTodayUtc } } }),
    prisma.uploadedDocument.count(),
  ]);

  // AI consumption and budget
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [globalCounter, budgetSetting, aiEnabledSetting] = await Promise.all([
    prisma.usageCounter.findUnique({
      where: {
        scopeType_scopeId_periodType_periodStart: {
          scopeType: 'GLOBAL',
          scopeId: 'SYSTEM',
          periodType: 'MONTH',
          periodStart,
        },
      },
    }),
    prisma.applicationSetting.findUnique({ where: { key: 'globalMonthlyBudgetUsd' } }),
    prisma.applicationSetting.findUnique({ where: { key: 'aiEnabled' } }),
  ]);

  const totalBudget = new Decimal(
    typeof budgetSetting?.value === 'number' || typeof budgetSetting?.value === 'string'
      ? String(budgetSetting.value)
      : '50.00'
  );
  const used = globalCounter?.costUsed ? new Decimal(globalCounter.costUsed) : new Decimal(0);
  const reserved = globalCounter?.costReserved ? new Decimal(globalCounter.costReserved) : new Decimal(0);
  const remaining = Decimal.max(0, totalBudget.minus(used).minus(reserved));
  const aiEnabled = aiEnabledSetting?.value !== false;

  return {
    totalRegisteredUsers,
    activeUsers7d,
    activeDemoSessions,
    interviews: {
      realTotal,
      realToday,
      demoTotal,
      demoToday,
    },
    uploadedDocumentsTotal,
    budget: {
      period,
      totalBudgetUsd: totalBudget.toFixed(2),
      usedUsd: used.toFixed(2),
      reservedUsd: reserved.toFixed(2),
      remainingUsd: remaining.toFixed(2),
      aiEnabled,
    },
  };
}

/**
 * ADM-3: Users management
 */
export async function listAdminUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  role?: string;
  isDemo?: boolean;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { profile: { fullName: { contains: params.search, mode: 'insensitive' } } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.role) where.role = params.role;
  if (params.isDemo !== undefined) where.isDemo = params.isDemo;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isDemo: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            targetRole: true,
            experienceLevel: true,
          },
        },
        _count: {
          select: {
            interviews: true,
            documents: true,
          },
        },
      },
    }),
  ]);

  return {
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      isDemo: u.isDemo,
      fullName: u.profile?.fullName || null,
      targetRole: u.profile?.targetRole || null,
      interviewsCount: u._count.interviews,
      documentsCount: u._count.documents,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function setUserBlockStatus(
  adminActorId: string,
  targetUserId: string,
  block: boolean
) {
  if (adminActorId === targetUserId) {
    throw new AppError('FORBIDDEN', 'An administrator cannot block their own account.', 403);
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, status: true, email: true },
  });

  if (!target) {
    throw new AppError('NOT_FOUND', 'User not found.', 404);
  }

  if (target.role === 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Cannot modify the status of another administrator.', 403);
  }

  const newStatus = block ? 'BLOCKED' : 'ACTIVE';

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
    });

    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: block ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { targetEmail: target.email, previousStatus: target.status, newStatus },
    });
  });

  return { id: targetUserId, status: newStatus };
}

export async function deleteUserByAdmin(adminActorId: string, targetUserId: string) {
  if (adminActorId === targetUserId) {
    throw new AppError('FORBIDDEN', 'An administrator cannot delete their own account.', 403);
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, email: true },
  });

  if (!target) {
    throw new AppError('NOT_FOUND', 'User not found.', 404);
  }

  if (target.role === 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Cannot delete another administrator.', 403);
  }

  // 1. Mark DELETING
  await prisma.user.update({
    where: { id: targetUserId },
    data: { status: 'DELETING' },
  });

  // 2. Storage cleanup (fail closed on audit)
  try {
    await getStorageAdapter().deleteAllUserFiles(targetUserId);
  } catch {
    // Continue cleanup
  }

  // 3. Hard delete + Audit write in one transaction
  await prisma.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id: targetUserId },
    });

    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: 'USER_DELETED_BY_ADMIN',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { targetEmail: target.email },
    });
  });

  return { success: true };
}

/**
 * ADM-4: Documents management
 */
export async function listAdminDocuments(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { originalName: { contains: params.search, mode: 'insensitive' } },
      { user: { email: { contains: params.search, mode: 'insensitive' } } },
    ];
  }
  if (params.type) where.type = params.type;

  const [total, docs] = await Promise.all([
    prisma.uploadedDocument.count({ where }),
    prisma.uploadedDocument.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, isDemo: true } },
      },
    }),
  ]);

  return {
    items: docs.map((d) => ({
      id: d.id,
      originalName: d.originalName,
      type: d.type,
      sizeBytes: d.sizeBytes,
      mimeType: d.mimeType,
      status: d.status,
      storageFileId: d.storageFileId,
      createdAt: d.createdAt.toISOString(),
      user: {
        id: d.user.id,
        email: d.user.email,
        isDemo: d.user.isDemo,
      },
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function previewOrDownloadDocumentByAdmin(
  adminActorId: string,
  documentId: string,
  actionType: 'DOCUMENT_PREVIEWED' | 'DOCUMENT_DOWNLOADED'
) {
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
    include: { user: { select: { email: true } } },
  });

  if (!doc) {
    throw new AppError('NOT_FOUND', 'Document not found.', 404);
  }

  // Audit write is required. If audit fails, entire action fails (fail closed - ADM-4, SEC-1).
  await prisma.$transaction(async (tx) => {
    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: actionType,
      targetType: 'UploadedDocument',
      targetId: documentId,
      metadata: { originalName: doc.originalName, ownerEmail: doc.user.email },
    });
  });

  const fileBuffer = doc.storageFileId
    ? await getStorageAdapter().getFileBuffer(doc.storageFileId)
    : Buffer.from(doc.pastedText || '', 'utf-8');

  return {
    filename: doc.originalName || 'document',
    mimeType: doc.mimeType || 'application/octet-stream',
    data: fileBuffer,
  };
}

export async function deleteDocumentByAdmin(adminActorId: string, documentId: string) {
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
    include: { user: { select: { email: true } } },
  });

  if (!doc) {
    throw new AppError('NOT_FOUND', 'Document not found.', 404);
  }

  // Transaction delete + audit write (fail closed)
  await prisma.$transaction(async (tx) => {
    await tx.uploadedDocument.delete({ where: { id: documentId } });
    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: 'DOCUMENT_DELETED_BY_ADMIN',
      targetType: 'UploadedDocument',
      targetId: documentId,
      metadata: { originalName: doc.originalName, ownerEmail: doc.user.email },
    });
  });

  if (doc.storageFileId) {
    try {
      await getStorageAdapter().deleteFile(doc.storageFileId);
    } catch {
      // storage cleanup
    }
  }

  return { success: true };
}

/**
 * ADM-5: Interviews management
 */
export async function listAdminInterviews(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { configuration: { role: { contains: params.search, mode: 'insensitive' } } },
      { user: { email: { contains: params.search, mode: 'insensitive' } } },
    ];
  }
  if (params.status) where.status = params.status;

  const [total, interviews] = await Promise.all([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, isDemo: true } },
        configuration: true,
        report: true,
        questions: {
          include: {
            answer: {
              include: {
                evaluation: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    items: interviews.map((inv) => {
      const answers = inv.questions.filter((q) => q.answer && q.answer.evaluation);
      const scores = answers.map((q) => q.answer!.evaluation!.overallScore);
      const overallScore = calculateOverallScore(scores);

      return {
        id: inv.id,
        user: {
          id: inv.user.id,
          email: inv.user.email,
          isDemo: inv.user.isDemo,
        },
        role: inv.configuration?.role || 'Interview Session',
        type: inv.configuration?.type || 'TECHNICAL',
        mode: inv.mode,
        status: inv.status,
        durationMinutes: inv.configuration?.durationMinutes || 15,
        questionCount: inv.questions.length,
        overallScore,
        createdAt: inv.createdAt.toISOString(),
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function viewInterviewTranscriptOrReportByAdmin(
  adminActorId: string,
  interviewId: string
) {
  const inv = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      user: { select: { email: true, isDemo: true } },
      configuration: true,
      report: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          answer: {
            include: {
              evaluation: true,
            },
          },
        },
      },
    },
  });

  if (!inv) {
    throw new AppError('NOT_FOUND', 'Interview not found.', 404);
  }

  // Audited in transaction (ADM-5, SEC-1)
  await prisma.$transaction(async (tx) => {
    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: 'INTERVIEW_TRANSCRIPT_AUDITED',
      targetType: 'Interview',
      targetId: interviewId,
      metadata: { ownerEmail: inv.user.email, role: inv.configuration?.role },
    });
  });

  return {
    interview: {
      id: inv.id,
      user: inv.user,
      configuration: inv.configuration,
      status: inv.status,
      report: inv.report,
      questions: inv.questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        topic: q.topic,
        text: q.text,
        answer: q.answer
          ? {
              transcript: q.answer.transcript,
              isEmpty: q.answer.isEmpty,
              evaluation: q.answer.evaluation
                ? {
                    overallScore: q.answer.evaluation.overallScore,
                    criteriaScores: q.answer.evaluation.criteriaScores,
                  }
                : null,
            }
          : null,
      })),
    },
  };
}

/**
 * ADM-6: Usage aggregates
 */
export async function getAdminUsageAggregates() {
  const records = await prisma.aIUsageRecord.groupBy({
    by: ['model', 'operation'],
    _sum: {
      actualInputTokens: true,
      actualOutputTokens: true,
      costEstimated: true,
    },
    _count: {
      _all: true,
    },
  });

  return {
    costNote: 'ESTIMATED',
    aggregates: records.map((r) => ({
      model: r.model,
      operation: r.operation,
      totalPromptTokens: r._sum.actualInputTokens || 0,
      totalCompletionTokens: r._sum.actualOutputTokens || 0,
      totalCalls: r._count._all,
      estimatedCostUsd: r._sum.costEstimated ? new Decimal(r._sum.costEstimated).toFixed(4) : '0.0000',
    })),
  };
}

/**
 * ADM-7: Settings management & Emergency Shutdown
 */
export async function getAdminSettings() {
  const settings = await prisma.applicationSetting.findMany({
    orderBy: { key: 'asc' },
  });

  const settingsMap: Record<string, any> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return { settings: settingsMap };
}

export async function updateAdminSettings(
  adminActorId: string,
  updates: Record<string, any>
) {
  const allowedKeys = new Set([
    'aiEnabled',
    'demoEnabled',
    'liveDemoEnabled',
    'demoInterviewsPerIpPerDay',
    'demoGlobalInterviewsPerDay',
    'freeUserInterviewsPerMonth',
    'globalMonthlyBudgetUsd',
  ]);

  const auditedChanges: Record<string, { before: any; after: any }> = {};

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.has(key)) continue;

      // Range validation
      if (typeof value === 'number' && value < 0) {
        throw new AppError('INVALID_INPUT', `Value for ${key} cannot be negative.`, 400);
      }

      const existing = await tx.applicationSetting.findUnique({ where: { key } });
      const before = existing ? existing.value : null;

      await tx.applicationSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });

      auditedChanges[key] = { before, after: value };
    }

    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: 'SETTINGS_UPDATED',
      targetType: 'ApplicationSetting',
      targetId: 'BULK',
      metadata: { changes: auditedChanges },
    });
  });

  return { success: true, changes: auditedChanges };
}

export async function triggerEmergencyAiShutdown(adminActorId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.applicationSetting.upsert({
      where: { key: 'aiEnabled' },
      update: { value: false },
      create: { key: 'aiEnabled', value: false },
    });

    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: 'EMERGENCY_AI_SHUTDOWN',
      targetType: 'ApplicationSetting',
      targetId: 'aiEnabled',
      metadata: { previous: true, current: false },
    });
  });

  return { aiEnabled: false, status: 'SHUTDOWN_EXECUTED' };
}

/**
 * ADM-8: Audit log
 */
export async function listAdminAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  targetType?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.action) where.action = params.action;
  if (params.targetType) where.targetType = params.targetType;

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    items: logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * ADM-9, DEM-6: Reset demo data (cascades all demo users and sessions)
 */
export async function resetAllDemoData(adminActorId: string) {
  const deletedCount = await prisma.$transaction(async (tx) => {
    const deleted = await tx.user.deleteMany({
      where: { isDemo: true },
    });

    await recordAdminAudit(tx, {
      actorId: adminActorId,
      action: 'DEMO_DATA_RESET',
      targetType: 'DemoSession',
      targetId: 'ALL',
      metadata: { deletedDemoUsersCount: deleted.count },
    });

    return deleted.count;
  });

  return { success: true, deletedDemoUsersCount: deletedCount };
}
