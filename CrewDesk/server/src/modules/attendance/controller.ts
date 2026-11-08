import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './service.js';
import { checkInSchema, checkOutSchema, editAttendanceSchema, attendanceQuerySchema } from './schemas.js';

export class AttendanceController {
  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = checkInSchema.parse(req.body);
      const record = await attendanceService.checkIn(req.user!, input);
      res.status(201).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  };

  checkOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = checkOutSchema.parse(req.body);
      const record = await attendanceService.checkOut(req.user!, input);
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  };

  getTodayStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await attendanceService.getTodayStatus(req.user!);
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  };

  getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await attendanceService.listOwnAttendance(req.user!);
      res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  };

  getAllAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = attendanceQuerySchema.parse(req.query);
      const records = await attendanceService.listAllAttendance(query);
      res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  };

  editAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = editAttendanceSchema.parse(req.body);
      const updated = await attendanceService.editAttendance(req.user!.userId, req.params.id, input);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceController = new AttendanceController();
