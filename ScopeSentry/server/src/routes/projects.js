import { Router } from 'express';
import { z } from 'zod';
import {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
  handleUpdateProject,
  handleDeleteProject,
  handleArchiveProject,
  handleUnarchiveProject
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../config/constants.js';

const router = Router();

// Zod Validation Schemas
const createProjectSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be 120 characters or less'),
    description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
    projectType: z.enum(PROJECT_TYPES, {
      errorMap: () => ({ message: 'Invalid project type' })
    }),
    location: z.string().max(200, 'Location must be 200 characters or less').optional(),
    budget: z.number().min(0, 'Budget must be greater than or equal to 0').optional().nullable(),
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be a 3-letter ISO code')
      .regex(/^[A-Za-z]{3}$/, 'Currency must be 3 alphabetic letters')
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    expectedCompletionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'expectedCompletionDate must be in YYYY-MM-DD format')
      .optional()
      .nullable()
  })
};

const updateProjectSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be 120 characters or less').optional(),
    description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
    projectType: z.enum(PROJECT_TYPES, {
      errorMap: () => ({ message: 'Invalid project type' })
    }).optional(),
    location: z.string().max(200, 'Location must be 200 characters or less').optional(),
    budget: z.number().min(0, 'Budget must be greater than or equal to 0').optional().nullable(),
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be a 3-letter ISO code')
      .regex(/^[A-Za-z]{3}$/, 'Currency must be 3 alphabetic letters')
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    expectedCompletionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'expectedCompletionDate must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    status: z.enum(PROJECT_STATUSES).optional()
  })
};

// All project routes require authentication
router.use(authenticate);

router.get('/', handleListProjects);
router.post('/', csrfProtection, validate(createProjectSchema), handleCreateProject);
router.get('/:id', handleGetProject);
router.patch('/:id', csrfProtection, validate(updateProjectSchema), handleUpdateProject);
router.delete('/:id', csrfProtection, handleDeleteProject);
router.post('/:id/archive', csrfProtection, handleArchiveProject);
router.post('/:id/unarchive', csrfProtection, handleUnarchiveProject);

export default router;
