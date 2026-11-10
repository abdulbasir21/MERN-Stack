import type { Prisma, PrismaClient } from '@prisma/client';

type PrismaTxOrClient = Prisma.TransactionClient | PrismaClient;

const FORBIDDEN_METADATA_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'secret',
  'apikey',
  'jwt',
  'cookie',
]);

function sanitizeAuditMetadata(
  metadata?: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(k.toLowerCase())) {
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      cleaned[k] = sanitizeAuditMetadata(v as Record<string, unknown>);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned as Prisma.InputJsonValue;
}

export interface RecordAuditParams {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an AdminAuditLog row within the same database transaction (SEC-1, ADM-4, ADM-7).
 * If this write fails, the enclosing transaction rolls back (fail closed).
 */
export async function recordAdminAudit(
  db: PrismaTxOrClient,
  params: RecordAuditParams
): Promise<void> {
  await db.adminAuditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: String(params.targetId),
      metadata: sanitizeAuditMetadata(params.metadata),
    },
  });
}
