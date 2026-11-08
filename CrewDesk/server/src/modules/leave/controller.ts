import { Request, Response, NextFunction } from 'express';
import { leaveService } from './service.js';
import { createLeaveRequestSchema, rejectLeaveSchema, leaveQuerySchema } from './schemas.js';

export class LeaveController {
  getMyBalances = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const balances = await leaveService.getLeaveBalancesWithRemaining(req.user!.userId, year);
      res.json({ success: true, data: balances });
    } catch (err) {
      next(err);
    }
  };

  getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requests = await leaveService.listMyLeaveRequests(req.user!.userId);
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  };

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createLeaveRequestSchema.parse(req.body);
      const leave = await leaveService.createLeaveRequest(req.user!, input);
      res.status(201).json({ success: true, data: leave });
    } catch (err) {
      next(err);
    }
  };

  cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cancelled = await leaveService.cancelLeaveRequest(req.user!, req.params.id);
      res.json({ success: true, data: cancelled });
    } catch (err) {
      next(err);
    }
  };

  getApprovalQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queue = await leaveService.listApprovalQueue(req.user!);
      res.json({ success: true, data: queue });
    } catch (err) {
      next(err);
    }
  };

  approveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const approved = await leaveService.approveLeaveRequest(req.user!, req.params.id);
      res.json({ success: true, data: approved });
    } catch (err) {
      next(err);
    }
  };

  rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = rejectLeaveSchema.parse(req.body);
      const rejected = await leaveService.rejectLeaveRequest(req.user!, req.params.id, input);
      res.json({ success: true, data: rejected });
    } catch (err) {
      next(err);
    }
  };

  getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = leaveQuerySchema.parse(req.query);
      const requests = await leaveService.listAllLeaveRequests(query);
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  };
}

export const leaveController = new LeaveController();
