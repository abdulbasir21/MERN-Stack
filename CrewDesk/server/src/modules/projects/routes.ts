import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { demoGuard } from '../../middleware/demoGuard.js';
import { validate } from '../../middleware/validate.js';
import { projectController } from './controller.js';
import {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from './schemas.js';

export const projectRouter = Router();

// ==========================================
// Clients
// ==========================================
projectRouter.get(
  '/clients',
  authenticate,
  requirePermission('client:read'),
  (req, res, next) => projectController.listClients(req, res, next)
);

projectRouter.get(
  '/clients/:id',
  authenticate,
  requirePermission('client:read'),
  (req, res, next) => projectController.getClientById(req, res, next)
);

projectRouter.post(
  '/clients',
  authenticate,
  requirePermission('client:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'client:create' }),
  validate(createClientSchema),
  (req, res, next) => projectController.createClient(req, res, next)
);

projectRouter.put(
  '/clients/:id',
  authenticate,
  requirePermission('client:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'client:update' }),
  validate(updateClientSchema),
  (req, res, next) => projectController.updateClient(req, res, next)
);

// ==========================================
// Projects
// ==========================================
projectRouter.get(
  '/projects',
  authenticate,
  requirePermission('project:read'),
  (req, res, next) => projectController.listProjects(req, res, next)
);

projectRouter.get(
  '/projects/:id',
  authenticate,
  requirePermission('project:read'),
  (req, res, next) => projectController.getProjectById(req, res, next)
);

projectRouter.post(
  '/projects',
  authenticate,
  requirePermission('project:create'),
  demoGuard('SANDBOX_WRITE', { actionName: 'project:create' }),
  validate(createProjectSchema),
  (req, res, next) => projectController.createProject(req, res, next)
);

projectRouter.put(
  '/projects/:id',
  authenticate,
  requirePermission('project:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'project:update' }),
  validate(updateProjectSchema),
  (req, res, next) => projectController.updateProject(req, res, next)
);

// Team Members
projectRouter.post(
  '/projects/:id/members',
  authenticate,
  requirePermission('team:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'team:add-member' }),
  validate(addMemberSchema),
  (req, res, next) => projectController.addMember(req, res, next)
);

projectRouter.delete(
  '/projects/:id/members/:userId',
  authenticate,
  requirePermission('team:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'team:remove-member' }),
  (req, res, next) => projectController.removeMember(req, res, next)
);

// Milestones
projectRouter.post(
  '/projects/:id/milestones',
  authenticate,
  requirePermission('milestone:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'milestone:create' }),
  validate(createMilestoneSchema),
  (req, res, next) => projectController.createMilestone(req, res, next)
);

projectRouter.put(
  '/projects/:id/milestones/:milestoneId',
  authenticate,
  requirePermission('milestone:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'milestone:update' }),
  validate(updateMilestoneSchema),
  (req, res, next) => projectController.updateMilestone(req, res, next)
);
