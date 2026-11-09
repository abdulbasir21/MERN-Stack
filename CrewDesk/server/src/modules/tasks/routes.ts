import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { demoGuard } from '../../middleware/demoGuard.js';
import { validate } from '../../middleware/validate.js';
import { taskController } from './controller.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskEmployeeSchema,
  createCommentSchema,
} from './schemas.js';

export const taskRouter = Router();

taskRouter.get(
  '/tasks',
  authenticate,
  requirePermission('task:read-own'),
  (req, res, next) => taskController.list(req, res, next)
);

taskRouter.get(
  '/tasks/:id',
  authenticate,
  requirePermission('task:read-own'),
  (req, res, next) => taskController.getById(req, res, next)
);

// PM & Owner create tasks
taskRouter.post(
  '/tasks',
  authenticate,
  requirePermission('task:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'task:create' }),
  validate(createTaskSchema),
  (req, res, next) => taskController.create(req, res, next)
);

// PM & Owner edit task details
taskRouter.put(
  '/tasks/:id',
  authenticate,
  requirePermission('task:manage'),
  demoGuard('SANDBOX_WRITE', { actionName: 'task:update' }),
  validate(updateTaskSchema),
  (req, res, next) => taskController.updateByManager(req, res, next)
);

// Employee updates status/progress on own task
taskRouter.patch(
  '/tasks/:id/progress',
  authenticate,
  requirePermission('task:update-own'),
  demoGuard('SANDBOX_WRITE', { actionName: 'task:update-progress' }),
  validate(updateTaskEmployeeSchema),
  (req, res, next) => taskController.updateByEmployee(req, res, next)
);

// Comments
taskRouter.post(
  '/tasks/:id/comments',
  authenticate,
  requirePermission('comment:create'),
  demoGuard('SANDBOX_WRITE', { actionName: 'comment:create' }),
  validate(createCommentSchema),
  (req, res, next) => taskController.addComment(req, res, next)
);
