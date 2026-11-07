import { z } from 'zod';
import { SERVICE_CATEGORIES, LIMITS } from '../../config/constants';

const checklistItemInputSchema = z.union([
  z.string().min(3, 'Item must be at least 3 characters').max(200, 'Item cannot exceed 200 characters'),
  z.object({
    item: z.string().min(3, 'Item must be at least 3 characters').max(200, 'Item cannot exceed 200 characters'),
    helpText: z.string().max(300, 'Help text cannot exceed 300 characters').optional(),
    required: z.boolean().default(true),
    order: z.number().int().min(0).optional()
  })
]);

export const createServiceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters').trim(),
  category: z.enum(SERVICE_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid service category' })
  }),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').trim().optional(),
  startingPrice: z.number().min(0, 'Starting price cannot be negative').optional(),
  pricingUnit: z.enum(['fixed', 'hourly', 'starting_at']).optional().default('starting_at'),
  deliveryTimeEstimate: z.string().max(100, 'Delivery estimate cannot exceed 100 characters').trim().optional(),
  requirementsChecklist: z
    .array(checklistItemInputSchema)
    .max(LIMITS.MAX_CHECKLIST_ITEMS, `Requirements checklist cannot exceed ${LIMITS.MAX_CHECKLIST_ITEMS} items`)
    .optional()
});

export const updateServiceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters').trim().optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').trim().optional(),
  startingPrice: z.number().min(0, 'Starting price cannot be negative').optional(),
  pricingUnit: z.enum(['fixed', 'hourly', 'starting_at']).optional(),
  deliveryTimeEstimate: z.string().max(100, 'Delivery estimate cannot exceed 100 characters').trim().optional(),
  requirementsChecklist: z
    .array(checklistItemInputSchema)
    .max(LIMITS.MAX_CHECKLIST_ITEMS, `Requirements checklist cannot exceed ${LIMITS.MAX_CHECKLIST_ITEMS} items`)
    .optional(),
  isActive: z.boolean().optional()
});

export const createPortfolioItemSchema = z.object({
  title: z.string().min(3, 'Portfolio title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters').trim(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').trim().optional(),
  image: z.object({
    url: z.string().url('Invalid image URL'),
    fileId: z.string().min(1, 'File ID is required')
  })
});

export const updatePortfolioItemSchema = z.object({
  title: z.string().min(3, 'Portfolio title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters').trim().optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').trim().optional(),
  image: z
    .object({
      url: z.string().url('Invalid image URL'),
      fileId: z.string().min(1, 'File ID is required')
    })
    .optional()
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreatePortfolioItemInput = z.infer<typeof createPortfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
