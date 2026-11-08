import { Request, Response, NextFunction } from 'express';
import { taskService } from './service.js';
import { taskQuerySchema } from './schemas.js';

export class TaskController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = taskQuerySchema.parse(req.query);
      const tasks = await taskService.listTasks(req.user!, query);
      return res.status(200).json({ data: { tasks } });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getTaskById(req.user!, req.params.id);
      return res.status(200).json({ data: { task } });
    } catch (err) {
      return next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.createTask(req.user!, req.body);
      return res.status(201).json({ data: { task } });
    } catch (err) {
      return next(err);
    }
  }

  async updateByManager(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.updateTaskByManager(req.user!, req.params.id, req.body);
      return res.status(200).json({ data: { task } });
    } catch (err) {
      return next(err);
    }
  }

  async updateByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.updateTaskByEmployee(req.user!, req.params.id, req.body);
      return res.status(200).json({ data: { task } });
    } catch (err) {
      return next(err);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const comment = await taskService.addComment(req.user!, req.params.id, req.body);
      return res.status(201).json({ data: { comment } });
    } catch (err) {
      return next(err);
    }
  }
}

export const taskController = new TaskController();
