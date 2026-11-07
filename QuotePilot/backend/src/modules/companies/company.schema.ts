import { z } from 'zod';
import { SERVICE_CATEGORIES } from '../../config/constants';

export const registerCompanySchema = z.object({
  companyName: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .max(80, 'Company name cannot exceed 80 characters'),
  ownerName: z
    .string({ required_error: 'Owner name is required' })
    .trim()
    .min(2, 'Owner name must be at least 2 characters')
    .max(80, 'Owner name cannot exceed 80 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .max(254, 'Email cannot exceed 254 characters')
    .toLowerCase(),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/, 'Phone number format is invalid'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(80, 'City cannot exceed 80 characters'),
  mainCategory: z.enum(SERVICE_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid main service category' }),
  }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const updateCompanyProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  contactPhone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/).optional(),
  contactEmail: z.string().trim().email().toLowerCase().optional(),
  website: z.string().trim().url('Website must be a valid URL').optional().or(z.literal('')),
  logo: z
    .object({
      url: z.string().url(),
      fileId: z.string(),
    })
    .optional(),
});

export const rejectCompanySchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required' })
    .trim()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason cannot exceed 500 characters'),
});

export const blockCompanySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
export type RejectCompanyInput = z.infer<typeof rejectCompanySchema>;
export type BlockCompanyInput = z.infer<typeof blockCompanySchema>;
