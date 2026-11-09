import { Request, Response, NextFunction } from 'express';
import { projectService } from './service.js';

export class ProjectController {
  // Clients
  async listClients(req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await projectService.listClients(Boolean(req.user?.isDemo));
      return res.status(200).json({ data: { clients } });
    } catch (err) {
      return next(err);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await projectService.getClientById(req.params.id, Boolean(req.user?.isDemo));
      return res.status(200).json({ data: { client } });
    } catch (err) {
      return next(err);
    }
  }

  async createClient(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await projectService.createClient(req.user!, req.body);
      return res.status(201).json({ data: { client } });
    } catch (err) {
      return next(err);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await projectService.updateClient(req.user!, req.params.id, req.body);
      return res.status(200).json({ data: { client } });
    } catch (err) {
      return next(err);
    }
  }

  // Projects
  async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.listProjects(req.user!);
      return res.status(200).json({ data: { projects } });
    } catch (err) {
      return next(err);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProjectById(req.user!, req.params.id);
      return res.status(200).json({ data: { project } });
    } catch (err) {
      return next(err);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.createProject(req.user!, req.body);
      return res.status(201).json({ data: { project } });
    } catch (err) {
      return next(err);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.updateProject(req.user!, req.params.id, req.body);
      return res.status(200).json({ data: { project } });
    } catch (err) {
      return next(err);
    }
  }

  // Team
  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await projectService.addMember(req.user!, req.params.id, req.body);
      return res.status(201).json({ data: { member } });
    } catch (err) {
      return next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await projectService.removeMember(req.user!, req.params.id, req.params.userId);
      return res.status(200).json({ data: result });
    } catch (err) {
      return next(err);
    }
  }

  // Milestones
  async createMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const milestone = await projectService.createMilestone(req.user!, req.params.id, req.body);
      return res.status(201).json({ data: { milestone } });
    } catch (err) {
      return next(err);
    }
  }

  async updateMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const milestone = await projectService.updateMilestone(
        req.user!,
        req.params.id,
        req.params.milestoneId,
        req.body
      );
      return res.status(200).json({ data: { milestone } });
    } catch (err) {
      return next(err);
    }
  }
}

export const projectController = new ProjectController();
