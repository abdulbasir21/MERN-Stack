import { Request, Response, NextFunction } from 'express';
import { userService } from './service.js';
import { userQuerySchema } from './schemas.js';

export class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = userQuerySchema.parse(req.query);
      const result = await userService.listUsers(query);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id);
      return res.status(200).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const user = await userService.createEmployee(actorId, req.body);
      return res.status(201).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const user = await userService.createManager(actorId, req.body);
      return res.status(201).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async changeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const user = await userService.changeRole(actorId, req.params.id, req.body);
      return res.status(200).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const user = await userService.toggleUserActive(actorId, req.params.id, false);
      return res.status(200).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const user = await userService.toggleUserActive(actorId, req.params.id, true);
      return res.status(200).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async updateOwnProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await userService.updateOwnProfile(userId, req.body);
      return res.status(200).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user!.userId;
      const user = await userService.updateEmployee(actorId, req.params.id, req.body);
      return res.status(200).json({ data: { user } });
    } catch (err) {
      return next(err);
    }
  }
}

export const userController = new UserController();
