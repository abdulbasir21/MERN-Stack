import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  departmentId: z.string().uuid('Valid department ID is required'),
  title: z.string().min(1, 'Title is required'),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 chars'),
});

export const createManagerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum([
    'HR_MANAGER',
    'PROJECT_MANAGER',
    'FINANCE_MANAGER',
    'INVENTORY_MANAGER',
  ]),
  phone: z.string().optional(),
  departmentId: z.string().uuid('Valid department ID is required'),
  title: z.string().min(1, 'Title is required'),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 chars'),
});

export const changeRoleSchema = z.object({
  role: z.enum([
    'HR_MANAGER',
    'PROJECT_MANAGER',
    'FINANCE_MANAGER',
    'INVENTORY_MANAGER',
    'EMPLOYEE',
  ]),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
});

export const userQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  role: z.string().optional(),
  isActive: z.string().optional().transform((v) => (v !== undefined ? v === 'true' : undefined)),
});
