import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { demoGuard } from '../../middleware/demoGuard.js';
import { validate } from '../../middleware/validate.js';
import { avatarUpload } from '../../middleware/upload.js';
import { userController } from './controller.js';
import { avatarController } from '../profile/avatarController.js';
import { departmentController } from '../departments/controller.js';
import {
  createEmployeeSchema,
  createManagerSchema,
  changeRoleSchema,
  updateProfileSchema,
  updateEmployeeSchema,
  departmentSchema,
} from './schemas.js';

export const apiRouter = Router();

// ==========================================
// 1. Departments CRUD (HR & Owner)
// ==========================================
apiRouter.get(
  '/departments',
  authenticate,
  (req, res, next) => departmentController.list(req, res, next)
);

apiRouter.post(
  '/departments',
  authenticate,
  requirePermission('department:manage'),
  demoGuard('BLOCK', { actionName: 'department:create' }),
  validate(departmentSchema),
  (req, res, next) => departmentController.create(req, res, next)
);

apiRouter.delete(
  '/departments',
  authenticate,
  requirePermission('department:manage'),
  demoGuard('BLOCK', { actionName: 'department:delete' }),
  (req, res, next) => departmentController.delete(req, res, next)
);

apiRouter.delete(
  '/departments/:id',
  authenticate,
  requirePermission('department:manage'),
  demoGuard('BLOCK', { actionName: 'department:delete' }),
  (req, res, next) => departmentController.delete(req, res, next)
);

// ==========================================
// 2. Users & Employees Management
// ==========================================
apiRouter.get(
  '/users',
  authenticate,
  requirePermission('employee:list'),
  (req, res, next) => userController.list(req, res, next)
);

apiRouter.get(
  '/users/:id',
  authenticate,
  requirePermission('employee:list'),
  (req, res, next) => userController.getById(req, res, next)
);

// HR creates EMPLOYEE only
apiRouter.post(
  '/users/employee',
  authenticate,
  requirePermission('employee:create'),
  demoGuard('BLOCK', { actionName: 'employee:create' }),
  validate(createEmployeeSchema),
  (req, res, next) => userController.createEmployee(req, res, next)
);

// Owner creates MANAGERS only (dropdown selection)
apiRouter.post(
  '/users/manager',
  authenticate,
  requirePermission('manager:create'),
  demoGuard('BLOCK', { actionName: 'manager:create' }),
  validate(createManagerSchema),
  (req, res, next) => userController.createManager(req, res, next)
);

// Owner changes roles
apiRouter.put(
  '/users/:id/role',
  authenticate,
  requirePermission('role:change'),
  demoGuard('BLOCK', { actionName: 'role:change' }),
  validate(changeRoleSchema),
  (req, res, next) => userController.changeRole(req, res, next)
);

// Deactivate / Reactivate
apiRouter.patch(
  '/users/:id/deactivate',
  authenticate,
  requirePermission('employee:deactivate'),
  demoGuard('BLOCK', { actionName: 'employee:deactivate' }),
  (req, res, next) => userController.deactivate(req, res, next)
);

apiRouter.patch(
  '/users/:id/reactivate',
  authenticate,
  requirePermission('employee:deactivate'),
  demoGuard('BLOCK', { actionName: 'employee:reactivate' }),
  (req, res, next) => userController.reactivate(req, res, next)
);

// Update Employee
apiRouter.put(
  '/users/:id',
  authenticate,
  requirePermission('employee:update'),
  demoGuard('BLOCK', { actionName: 'employee:update' }),
  validate(updateEmployeeSchema),
  (req, res, next) => userController.updateEmployee(req, res, next)
);

// ==========================================
// 3. Profile & Avatar (Every role, own only)
// ==========================================
apiRouter.put(
  '/profile',
  authenticate,
  requirePermission('profile:update-own'),
  demoGuard('BLOCK', { actionName: 'profile:update-own' }),
  validate(updateProfileSchema),
  (req, res, next) => userController.updateOwnProfile(req, res, next)
);

apiRouter.post(
  '/profile/avatar',
  authenticate,
  requirePermission('avatar:update-own'),
  demoGuard('BLOCK', { actionName: 'avatar:upload' }),
  avatarUpload.single('avatar'),
  (req, res, next) => avatarController.uploadAvatar(req, res, next)
);

apiRouter.delete(
  '/profile/avatar',
  authenticate,
  requirePermission('avatar:update-own'),
  demoGuard('BLOCK', { actionName: 'avatar:delete' }),
  (req, res, next) => avatarController.removeAvatar(req, res, next)
);
