import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './service.js';

export class DashboardController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await dashboardService.getDashboardData(req.user!);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const dashboardController = new DashboardController();
