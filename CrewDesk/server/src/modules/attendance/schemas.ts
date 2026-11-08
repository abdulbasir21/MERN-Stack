import { z } from 'zod';

export const checkInSchema = z.object({
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().optional(),
});

export const editAttendanceSchema = z.object({
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

export const attendanceQuerySchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD
  userId: z.string().optional(),
  isLate: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
});
