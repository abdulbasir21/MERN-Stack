import { getDashboardData } from '../services/dashboardService.js';

export async function getDashboardHandler(req, res, next) {
  try {
    const data = await getDashboardData(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
