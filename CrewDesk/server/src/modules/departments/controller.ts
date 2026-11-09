import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { scopeRoot } from '../../lib/demoScope.js';

export class DepartmentController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const isDemo = Boolean(req.user?.isDemo);
      const departments = await prisma.department.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { users: { where: scopeRoot(isDemo) } } },
        },
      });
      return res.status(200).json({ data: { departments } });
    } catch (err) {
      return next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      const existing = await prisma.department.findUnique({ where: { name } });
      if (existing) {
        return res.status(409).json({
          error: { code: 'CONFLICT', message: 'Department already exists' },
        });
      }

      const department = await prisma.department.create({
        data: { name },
      });

      await logAudit(req.user!.userId, 'department:create', 'Department', department.id, null, { name });

      return res.status(201).json({ data: { department } });
    } catch (err) {
      return next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const count = await prisma.user.count({ where: { departmentId: id } });
      if (count > 0) {
        return res.status(422).json({
          error: { code: 'CANNOT_DELETE', message: 'Cannot delete department with assigned employees.' },
        });
      }

      await prisma.department.delete({ where: { id } });
      await logAudit(req.user!.userId, 'department:delete', 'Department', id);

      return res.status(200).json({ data: { message: 'Department deleted successfully.' } });
    } catch (err) {
      return next(err);
    }
  }
}

export const departmentController = new DepartmentController();
