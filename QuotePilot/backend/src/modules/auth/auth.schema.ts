import { z } from 'zod';

// SRS §2 Validation Rules:
// - email: valid format, <= 254 chars, lowercase
// - password: 8-72 chars, at least one letter and one number
// - name: 2-80 chars, trimmed
// - phone: 7-20 chars, digits, spaces, +, - (optional)

export const registerCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .max(254, 'Email cannot exceed 254 characters')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/, 'Phone number format is invalid')
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/, 'Phone number format is invalid')
    .optional(),
});

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
