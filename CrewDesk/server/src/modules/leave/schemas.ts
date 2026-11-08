import { z } from 'zod';
import { LeaveStatus } from '@prisma/client';

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

export const rejectLeaveSchema = z.object({
  decisionReason: z.string().min(3, 'Rejection reason is required and must be at least 3 characters'),
});

export const leaveQuerySchema = z.object({
  status: z.nativeEnum(LeaveStatus).optional(),
  userId: z.string().uuid().optional(),
  year: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});
