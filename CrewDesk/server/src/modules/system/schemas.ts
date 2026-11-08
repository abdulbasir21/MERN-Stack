import { z } from 'zod';

export const updateSettingsSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  currency: z.string().min(1).max(5),
  timezone: z.string().min(2),
  officeStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'officeStartTime must be HH:mm format'),
  lateGraceMinutes: z.number().int().nonnegative().default(15),
});

export const auditLogQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? Math.max(1, parseInt(v, 10)) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10))) : 25)),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
});
