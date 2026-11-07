import { z } from 'zod';
import { LIMITS } from '../../config/constants';

export const validateInquiryBriefSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  description: z
    .string()
    .min(LIMITS.MIN_INQUIRY_DESCRIPTION, `Description must be at least ${LIMITS.MIN_INQUIRY_DESCRIPTION} characters`)
    .max(LIMITS.MAX_INQUIRY_DESCRIPTION, `Description cannot exceed ${LIMITS.MAX_INQUIRY_DESCRIPTION} characters`)
    .trim(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  deadline: z.string().optional(),
  round: z.number().int().min(1).default(1),
});

export const createInquirySchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  description: z
    .string()
    .min(LIMITS.MIN_INQUIRY_DESCRIPTION, `Description must be at least ${LIMITS.MIN_INQUIRY_DESCRIPTION} characters`)
    .max(LIMITS.MAX_INQUIRY_DESCRIPTION, `Description cannot exceed ${LIMITS.MAX_INQUIRY_DESCRIPTION} characters`)
    .trim(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  deadline: z.string().optional(),
  aiValidation: z
    .object({
      rounds: z.number().int().min(1).default(1),
      overridden: z.boolean().default(false),
      skipped: z.boolean().default(false),
      lastResult: z
        .object({
          isComplete: z.boolean(),
          missing: z.array(z.string()),
          message: z.string(),
        })
        .optional(),
    })
    .default({
      rounds: 1,
      overridden: false,
      skipped: false,
    }),
  clientRequestId: z.string().optional(),
});

export type ValidateInquiryBriefInput = z.infer<typeof validateInquiryBriefSchema>;
export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
