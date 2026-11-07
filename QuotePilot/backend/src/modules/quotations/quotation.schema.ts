import { z } from 'zod';

export const milestoneInputSchema = z.object({
  title: z
    .string()
    .min(3, 'Milestone title must be at least 3 characters')
    .max(100, 'Milestone title cannot exceed 100 characters'),
  amount: z.number().positive('Milestone amount must be greater than zero'),
  deliverables: z.array(z.string().min(1)).default([]),
  estimatedDeliveryDays: z
    .number()
    .int()
    .min(1, 'Delivery turnaround must be at least 1 day'),
});

export const createQuotationSchema = z
  .object({
    totalAmount: z.number().positive('Total quotation amount must be greater than zero'),
    validUntil: z.string().refine((val) => !isNaN(Date.parse(val)) && new Date(val) > new Date(), {
      message: 'Validity expiration date must be a valid future date',
    }),
    termsAndConditions: z.string().max(3000).optional(),
    milestones: z
      .array(milestoneInputSchema)
      .min(1, 'At least one milestone deliverable is required'),
  })
  .refine(
    (data) => {
      const sum = data.milestones.reduce((acc, m) => acc + m.amount, 0);
      return Math.abs(sum - data.totalAmount) < 0.01;
    },
    {
      message: 'Sum of milestone amounts must exactly match totalAmount',
      path: ['totalAmount'],
    }
  );

export const updateQuotationSchema = z
  .object({
    totalAmount: z.number().positive('Total quotation amount must be greater than zero'),
    validUntil: z.string().refine((val) => !isNaN(Date.parse(val)) && new Date(val) > new Date(), {
      message: 'Validity expiration date must be a valid future date',
    }),
    termsAndConditions: z.string().max(3000).optional(),
    changeReason: z.string().max(500).optional(),
    milestones: z
      .array(milestoneInputSchema)
      .min(1, 'At least one milestone deliverable is required'),
  })
  .refine(
    (data) => {
      const sum = data.milestones.reduce((acc, m) => acc + m.amount, 0);
      return Math.abs(sum - data.totalAmount) < 0.01;
    },
    {
      message: 'Sum of milestone amounts must exactly match totalAmount',
      path: ['totalAmount'],
    }
  );

export const rejectQuotationSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters').max(500).optional(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type RejectQuotationInput = z.infer<typeof rejectQuotationSchema>;
