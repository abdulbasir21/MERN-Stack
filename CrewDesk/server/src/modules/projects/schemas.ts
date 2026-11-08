import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().uuid('Valid client ID is required'),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  deadline: z.string().datetime(),
  budget: z.number().positive('Budget must be positive'),
  managerId: z.string().uuid('Valid manager ID is required'),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  managerId: z.string().uuid().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  role: z.string().optional(), // e.g. "Senior Backend Engineer"
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueDate: z.string().datetime(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'DONE']).optional(),
});
