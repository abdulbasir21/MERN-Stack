import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { AuthenticatedUser } from '../../middleware/auth.js';
import { checkInSchema, checkOutSchema, editAttendanceSchema, attendanceQuerySchema } from './schemas.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export class AttendanceService {
  private getCompanyDateString(now: Date, timezone: string): { dateStr: string; localHour: number; localMin: number } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }

    const dateStr = `${p.year}-${p.month}-${p.day}`;
    const localHour = parseInt(p.hour, 10);
    const localMin = parseInt(p.minute, 10);

    return { dateStr, localHour, localMin };
  }

  async checkIn(user: AuthenticatedUser, input: z.infer<typeof checkInSchema>) {
    // Owner does not punch in/out
    if (user.role === 'OWNER') {
      throw { status: 400, code: 'OWNER_EXEMPT', message: 'The Owner is exempt from attendance tracking.' };
    }

    const settings = await prisma.companySettings.findFirst();
    const timezone = settings?.timezone || 'UTC';
    const officeStartTime = settings?.officeStartTime || '09:00';
    const lateGraceMinutes = settings?.lateGraceMinutes ?? 15;

    const now = new Date();
    const { dateStr, localHour, localMin } = this.getCompanyDateString(now, timezone);

    // Rule: One record per user per day (unique constraint)
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: user.userId, date: dateStr } },
    });

    if (existing) {
      throw { status: 409, code: 'ALREADY_CHECKED_IN', message: 'You have already checked in for today.' };
    }

    // Determine late flag: check-in after office start + grace minutes
    const [startH, startM] = officeStartTime.split(':').map((v) => parseInt(v, 10));
    const startTotalMins = startH * 60 + startM;
    const currentTotalMins = localHour * 60 + localMin;
    const isLate = currentTotalMins > startTotalMins + lateGraceMinutes;

    const attendance = await prisma.attendance.create({
      data: {
        userId: user.userId,
        date: dateStr,
        checkIn: now,
        isLate,
        notes: input.notes,
      },
    });

    await logAudit(user.userId, 'attendance:check-in', 'Attendance', attendance.id, null, {
      date: dateStr,
      isLate,
    });

    return attendance;
  }

  async checkOut(user: AuthenticatedUser, input: z.infer<typeof checkOutSchema>) {
    if (user.role === 'OWNER') {
      throw { status: 400, code: 'OWNER_EXEMPT', message: 'The Owner is exempt from attendance tracking.' };
    }

    const settings = await prisma.companySettings.findFirst();
    const timezone = settings?.timezone || 'UTC';
    const now = new Date();
    const { dateStr } = this.getCompanyDateString(now, timezone);

    const record = await prisma.attendance.findUnique({
      where: { userId_date: { userId: user.userId, date: dateStr } },
    });

    if (!record) {
      throw { status: 400, code: 'NO_CHECK_IN', message: 'You have not checked in today yet.' };
    }

    if (record.checkOut) {
      throw { status: 409, code: 'ALREADY_CHECKED_OUT', message: 'You have already checked out today.' };
    }

    // Business rule: Working hours are strictly CALCULATED, never manually typed
    const checkInMs = record.checkIn.getTime();
    const checkOutMs = now.getTime();
    const diffHours = (checkOutMs - checkInMs) / (1000 * 60 * 60);
    const roundedHours = Math.round(diffHours * 100) / 100;

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        workingHours: new Prisma.Decimal(roundedHours),
        notes: input.notes ? `${record.notes || ''} | ${input.notes}`.trim() : record.notes,
      },
    });

    await logAudit(user.userId, 'attendance:check-out', 'Attendance', record.id, null, {
      workingHours: roundedHours,
    });

    return updated;
  }

  async getTodayStatus(user: AuthenticatedUser) {
    const settings = await prisma.companySettings.findFirst();
    const timezone = settings?.timezone || 'UTC';
    const { dateStr } = this.getCompanyDateString(new Date(), timezone);

    return prisma.attendance.findUnique({
      where: { userId_date: { userId: user.userId, date: dateStr } },
    });
  }

  async listOwnAttendance(user: AuthenticatedUser) {
    return prisma.attendance.findMany({
      where: { userId: user.userId },
      orderBy: { checkIn: 'desc' },
      take: 30, // Last 30 working records
    });
  }

  async listAllAttendance(query: z.infer<typeof attendanceQuerySchema>) {
    const where: Prisma.AttendanceWhereInput = {};

    if (query.date) where.date = query.date;
    if (query.userId) where.userId = query.userId;
    if (query.isLate !== undefined) where.isLate = query.isLate;

    return prisma.attendance.findMany({
      where,
      orderBy: { checkIn: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
      },
    });
  }

  async editAttendance(actorId: string, attendanceId: string, input: z.infer<typeof editAttendanceSchema>) {
    const existing = await prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Attendance record not found.' };
    }

    const newCheckIn = new Date(input.checkIn);
    let newCheckOut: Date | null = null;
    let workingHours: Prisma.Decimal | null = null;

    if (input.checkOut) {
      newCheckOut = new Date(input.checkOut);
      const diffHours = (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60);
      const rounded = Math.round(diffHours * 100) / 100;
      workingHours = new Prisma.Decimal(rounded);
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        workingHours,
        notes: input.notes || existing.notes,
      },
    });

    // Business rule: HR edits are audit-logged with old and new values
    await logAudit(
      actorId,
      'attendance:edit',
      'Attendance',
      attendanceId,
      {
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
        workingHours: existing.workingHours,
      },
      {
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
        workingHours: updated.workingHours,
      }
    );

    return updated;
  }
}

export const attendanceService = new AttendanceService();
